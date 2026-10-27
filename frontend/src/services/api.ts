import axios from "axios";

import { useApiDiagnosticsStore } from "../store/apiDiagnosticsStore";
import { useApiStatusStore } from "../store/apiStatusStore";

// In dev, Vite proxies /api to the FastAPI server (see vite.config.ts),
// so this stays relative and works the same in prod behind a reverse proxy.
export const api = axios.create({
  baseURL: "/api",
  timeout: 15_000,
});

// Keeps the shared "is the backend actually reachable" flag (see
// apiStatusStore.ts) accurate in real time, for free, off every real
// request the app makes — not just TopBar's periodic health check. This is
// what fixes the "header says connected while register says it can't
// reach the backend" inconsistency: both now read the exact same state,
// and that state updates the instant a real request either succeeds or
// genuinely fails to reach the server, not just once a minute.
//
// The distinction that matters is NOT simply "did a response arrive" —
// in dev/preview, requests go through Vite's own proxy (see
// vite.config.ts), and when the real backend is unreachable, THAT PROXY
// itself answers the browser with a plain-text 500, not a response-less
// network error. So a 5xx (or a truly response-less failure — connection
// refused, DNS failure, CORS block, timeout) has to be treated as "the
// API isn't answering correctly right now," whether the failure is the
// backend crashing or the proxy failing to reach it — both mean the same
// thing to a user staring at this indicator. A 4xx (401 on a bad login,
// 409 on a duplicate email, 422 on bad input, ...) is reliable proof the
// real backend DID answer, since the proxy's own failure response is
// always a 500, never a 4xx — so only a 4xx marks the API up here.
api.interceptors.response.use(
  (response) => {
    useApiStatusStore.getState().markUp();
    useApiDiagnosticsStore.getState().logRequest({
      method: (response.config.method ?? "get").toUpperCase(),
      path: response.config.url ?? "",
      status: response.status,
      ok: true,
    });
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status && status < 500) {
      useApiStatusStore.getState().markUp();
    } else {
      useApiStatusStore.getState().markDown();
    }
    // Classifies a response-less failure the same way a developer would
    // read it in the browser's network tab, rather than just "Error" —
    // this is exactly the "ECONNREFUSED"-style signal the dev diagnostics
    // panel exists to surface.
    const diagnosticStatus: number | string =
      status ??
      (error?.code === "ECONNABORTED"
        ? "Timeout"
        : error?.message?.includes("Network Error")
        ? "ECONNREFUSED (no response — is the backend running?)"
        : error?.code ?? "Network Error");
    useApiDiagnosticsStore.getState().logRequest({
      method: (error?.config?.method ?? "get").toUpperCase(),
      path: error?.config?.url ?? "",
      status: diagnosticStatus,
      ok: false,
    });
    return Promise.reject(error);
  }
);

// Attaches the real JWT from localStorage (written by authStore) to every
// request once a user has signed in. Reads localStorage directly here
// (rather than importing the zustand store) to avoid a circular import
// between api.ts and authStore.ts, since authStore itself calls api.ts.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("nlp-nexus-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // localStorage unavailable or malformed — proceed unauthenticated.
  }
  return config;
});

export interface TokenizeComparison {
  whitespace: string[];
  rule_based: string[];
  regex: string[];
  sentences: string[];
}

export interface TokenizeResponse {
  input_text: string;
  tokens: TokenizeComparison;
  token_counts: Record<string, number>;
}

export async function tokenize(text: string): Promise<TokenizeResponse> {
  const { data } = await api.post<TokenizeResponse>("/tokenize", { text });
  return data;
}

export interface CYKCellOut {
  row: number;
  col: number;
  nonterminals: string[];
  // One rule string per entry in `nonterminals`, same order — e.g.
  // "NP -> Det N" or "Det -> 'the'" (Parsing Lab redesign: Bottom-Up vs
  // Top-Down comparison).
  rules: string[];
}

export interface ParseTreeNode {
  symbol: string;
  word: string | null;
  children: ParseTreeNode[];
  // The production that derived this node, e.g. "S -> NP VP" or
  // "Det -> 'the'" — shown when a student clicks the node in ParseTreeGraph.
  rule: string | null;
}

export interface CYKResponse {
  tokens: string[];
  accepted: boolean;
  table: CYKCellOut[];
  tree: ParseTreeNode | null;
  grammar_summary: Record<string, string[]>;
  unknown_words: string[];
}

export async function parseCYK(sentence: string): Promise<CYKResponse> {
  const { data } = await api.post<CYKResponse>("/parse/cyk", { sentence });
  return data;
}

export interface DerivationStepOut {
  step: number;
  symbol: string;
  rule: string;
  position: number;
  span: number;
}

export interface TopDownResponse {
  tokens: string[];
  accepted: boolean;
  // Root-first order (Start Symbol -> ... -> tokens) — the mirror image of
  // CYKResponse.table's leaves-first span order.
  steps: DerivationStepOut[];
  tree: ParseTreeNode | null;
  grammar_summary: Record<string, string[]>;
  unknown_words: string[];
  start_symbol: string;
}

export async function parseTopDown(sentence: string): Promise<TopDownResponse> {
  const { data } = await api.post<TopDownResponse>("/parse/top-down", { sentence });
  return data;
}

export interface TokenEmission {
  token: string;
  is_known: boolean;
  probabilities: Record<string, number>;
}

export interface TrellisCellOut {
  tag: string;
  log_score: number;
  backpointer: string | null;
}

export interface TrellisStepOut {
  token: string;
  is_known: boolean;
  cells: TrellisCellOut[];
}

export interface TaggedToken {
  token: string;
  tag: string;
}

export interface POSTaggingResponse {
  tokens: string[];
  tag_set: string[];
  tag_descriptions: Record<string, string>;
  initial_probabilities: Record<string, number>;
  transition_matrix: number[][];
  token_emissions: TokenEmission[];
  trellis: TrellisStepOut[];
  best_path: string[];
  best_path_score: number;
  tagged: TaggedToken[];
  unknown_tokens: string[];
  corpus_size: number;
}

export async function tagPOS(sentence: string): Promise<POSTaggingResponse> {
  const { data } = await api.post<POSTaggingResponse>("/pos-tagging/tag", { sentence });
  return data;
}

export interface JaccardResponse {
  set_a: string[];
  set_b: string[];
  intersection: string[];
  union: string[];
  intersection_size: number;
  union_size: number;
  jaccard: number;
}

export async function computeJaccard(setA: string[], setB: string[]): Promise<JaccardResponse> {
  const { data } = await api.post<JaccardResponse>("/semantics/jaccard", { set_a: setA, set_b: setB });
  return data;
}

export interface CosineResponse {
  vector_a: number[];
  vector_b: number[];
  dot_product: number;
  magnitude_a: number;
  magnitude_b: number;
  cosine_similarity: number;
}

export async function computeCosine(vectorA: number[], vectorB: number[]): Promise<CosineResponse> {
  const { data } = await api.post<CosineResponse>("/semantics/cosine", { vector_a: vectorA, vector_b: vectorB });
  return data;
}

export interface TfidfDocScore {
  doc_index: number;
  tf: number;
  tfidf: number;
}
export interface TfidfRow {
  term: string;
  df: number;
  idf: number;
  per_doc: TfidfDocScore[];
}
export interface TfidfResponse {
  documents: string[];
  vocabulary: string[];
  matrix: TfidfRow[];
}

export async function computeTfidf(documents: string[]): Promise<TfidfResponse> {
  const { data } = await api.post<TfidfResponse>("/semantics/tfidf", { documents });
  return data;
}

export interface WsdCandidate {
  sense_id: string;
  gloss: string;
  overlap_words: string[];
  overlap_count: number;
}
export interface WsdResponse {
  target_word: string;
  available: boolean;
  message: string | null;
  context_words: string[];
  candidates: WsdCandidate[];
  predicted_sense: string | null;
  tie: boolean;
}

export async function runWsd(sentence: string, targetWord: string): Promise<WsdResponse> {
  const { data } = await api.post<WsdResponse>("/semantics/wsd", { sentence, target_word: targetWord });
  return data;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  // Added for the "Couldn't reach the backend" debugging pass — a real,
  // live check of the backend's own DB session, not just "did HTTP answer".
  database: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export interface NgramRow {
  ngram: string;
  context: string | null;
  count: number;
  context_count: number;
  probability_unsmoothed: number;
  probability_laplace: number;
}
export interface NgramTableResponse {
  n: number;
  vocab_size: number;
  total_tokens: number;
  total_ngrams: number;
  distinct_ngrams: number;
  rows: NgramRow[];
  truncated: boolean;
}

export async function buildNgramTable(corpus: string[], n: number): Promise<NgramTableResponse> {
  const { data } = await api.post<NgramTableResponse>("/lm/ngrams", { corpus, n });
  return data;
}

export interface ProbabilityStep {
  ngram: string;
  context: string;
  target: string;
  count_ngram: number;
  context_count: number;
  probability: number;
  out_of_vocabulary: boolean;
}
export interface SentenceProbabilityResponse {
  sentence: string;
  n: number;
  smoothing: string;
  tokens: string[];
  steps: ProbabilityStep[];
  log_probability: number | null;
  total_probability: number;
  zero_probability: boolean;
  perplexity: number | null;
}

export async function computeSentenceProbability(
  corpus: string[],
  sentence: string,
  n: number,
  smoothing: "none" | "laplace"
): Promise<SentenceProbabilityResponse> {
  const { data } = await api.post<SentenceProbabilityResponse>("/lm/sentence-probability", {
    corpus,
    sentence,
    n,
    smoothing,
  });
  return data;
}

export interface PerplexityResponse {
  probability: number;
  n_words: number;
  perplexity: number;
}

export async function computePerplexity(probability: number, nWords: number): Promise<PerplexityResponse> {
  const { data } = await api.post<PerplexityResponse>("/lm/perplexity", { probability, n_words: nWords });
  return data;
}

export interface DiscourseCandidate {
  text: string;
  is_proper_noun: boolean;
  is_person: boolean;
  word_distance: number;
  gender: string;
  number: string;
  agrees_with_pronoun: boolean;
  reason: string;
}
export interface ResolvePronounResponse {
  sentence: string;
  pronoun: string;
  available: boolean;
  message: string | null;
  candidates: DiscourseCandidate[];
  resolved_antecedent: string | null;
}

export async function resolvePronoun(sentence: string, pronoun: string): Promise<ResolvePronounResponse> {
  const { data } = await api.post<ResolvePronounResponse>("/discourse/resolve-pronoun", {
    sentence,
    pronoun,
  });
  return data;
}

export interface WordMorphology {
  word: string;
  stem: string;
  lemma: string;
  lemma_method: string;
  prefix: string | null;
  root: string;
  suffix: string | null;
}
export interface MorphologyResponse {
  results: WordMorphology[];
}

export async function analyzeMorphology(words: string[]): Promise<MorphologyResponse> {
  const { data } = await api.post<MorphologyResponse>("/morphology/analyze", { words });
  return data;
}

export interface EditOperation {
  op: "match" | "substitute" | "insert" | "delete";
  source_char: string | null;
  target_char: string | null;
  source_index: number | null;
  target_index: number | null;
}
export interface EditDistanceResponse {
  source: string;
  target: string;
  distance: number;
  matrix: number[][];
  operations: EditOperation[];
}

export async function computeEditDistance(source: string, target: string): Promise<EditDistanceResponse> {
  const { data } = await api.post<EditDistanceResponse>("/edit-distance/compute", { source, target });
  return data;
}

export interface PipelineStageTrace {
  stage: string;
  tokens: string[];
}
export interface PipelineRunResponse {
  input_text: string;
  tokenizer: string;
  stages: string[];
  trace: PipelineStageTrace[];
  final_tokens: string[];
}

export async function runPlaygroundPipeline(
  text: string,
  tokenizer: string,
  stages: string[]
): Promise<PipelineRunResponse> {
  const { data } = await api.post<PipelineRunResponse>("/playground/run", { text, tokenizer, stages });
  return data;
}

export interface PipelineCompareResponse {
  pipeline_a: PipelineRunResponse;
  pipeline_b: PipelineRunResponse;
  vocab: string[];
  jaccard: {
    set_a: string[];
    set_b: string[];
    intersection: string[];
    union: string[];
    intersection_size: number;
    union_size: number;
    jaccard: number;
  };
  cosine: {
    vector_a: number[];
    vector_b: number[];
    dot_product: number;
    magnitude_a: number;
    magnitude_b: number;
    cosine_similarity: number;
  };
}

export async function comparePlaygroundPipelines(
  textA: string,
  textB: string,
  tokenizer: string,
  stages: string[]
): Promise<PipelineCompareResponse> {
  const { data } = await api.post<PipelineCompareResponse>("/playground/compare", {
    text_a: textA,
    text_b: textB,
    tokenizer,
    stages,
  });
  return data;
}

export interface AuthUser {
  id: number;
  username: string;
  // College Email milestone (2026-10-08) -- signup now requires and
  // stores a real @vit.edu.in college email for every student/teacher
  // account. Only null for accounts created before this milestone.
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_verified: boolean;
  // "student" for every account created through /auth/register (that
  // endpoint hardcodes it server-side — there's no role field to set on
  // sign-up). "admin" only ever comes from the one seeded teacher account.
  role: "student" | "admin" | "super_admin";
  // Student/Teacher self-serve signup follow-up (2026-10-07) — true only
  // between registering with "Teacher" selected and a Super Admin's
  // approve/reject decision; see the backend's teacher_request_pending
  // comment. `role` itself stays "student" the whole time this is true.
  teacher_request_pending: boolean;
}
// email_status is only ever populated by /auth/register (null on login) —
// an honest, specific outcome of the real backend email send, never a
// fabricated "sent" when nothing actually went out. See email_service.py.
// Username/Password Authentication milestone (2026-10-07) -- "no_email"
// is the new, expected steady-state for a username-only account: there is
// no address to send to, so _send_account_created_email short-circuits
// before attempting SMTP. Not an error state.
export type EmailStatus = "sent" | "not_configured" | "smtp_error" | "disabled" | "no_email" | null;
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  email_status: EmailStatus;
}

export interface VerifyEmailResponse {
  verified: boolean;
  message: string;
  user: AuthUser;
}

export interface ResendVerificationResponse {
  email_status: string;
  message: string;
}

export async function registerAccount(
  username: string,
  fullName: string,
  // College-email requirement (2026-10-08) — required for every signup,
  // both account types; validated client-side (Register.tsx) and again
  // server-side (schemas.auth.RegisterRequest.validate_college_email).
  // Login is unaffected — still username + password only.
  collegeEmail: string,
  password: string,
  confirmPassword: string,
  // Birthday Experience milestone — both optional (signup must succeed
  // with neither present; see backend RegisterRequest/register_user).
  // `timezone` is the browser's own IANA zone name, captured once here so
  // "today" always means the user's own calendar day server-side.
  birthday?: string | null,
  timezone?: string | null,
  // Student/Teacher self-serve signup follow-up (2026-10-07). Picking
  // "teacher" never grants role="admin" directly — see the backend's own
  // comment on RegisterRequest.account_type — it only flags the new
  // account for Super Admin review (teacher_request_pending on the
  // response's `user`).
  accountType: "student" | "teacher" = "student"
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/register", {
    username,
    full_name: fullName,
    college_email: collegeEmail,
    password,
    confirm_password: confirmPassword,
    birthday: birthday || null,
    timezone: timezone || null,
    account_type: accountType,
  });
  return data;
}

export async function loginAccount(
  username: string,
  password: string,
  // Student/Teacher self-serve signup follow-up (2026-10-07). Optional —
  // omitting it (or passing undefined) skips the backend's role check
  // entirely, same as before this existed. When Login.tsx sends it, a
  // correct password on the WRONG tab (e.g. "Teacher" selected for a
  // student account) is rejected with a specific message instead of
  // succeeding — see auth_service.login_user's _account_type_matches.
  accountType?: "student" | "teacher"
): Promise<TokenResponse> {
  // Username/Password Authentication milestone (2026-10-07) — login is by
  // username now, not email; see schemas.auth.LoginRequest.
  const { data } = await api.post<TokenResponse>("/auth/login", {
    username,
    password,
    account_type: accountType ?? null,
  });
  return data;
}

export interface UsernameAvailability {
  available: boolean;
}

// Real-time signup availability check (spec section 1). Deliberately not
// debounced here — Register.tsx's own input handler debounces the calls;
// this is just the plain GET.
export async function checkUsernameAvailable(username: string): Promise<UsernameAvailability> {
  const { data } = await api.get<UsernameAvailability>("/auth/username-available", { params: { username } });
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function verifyEmailToken(token: string): Promise<VerifyEmailResponse> {
  const { data } = await api.get<VerifyEmailResponse>("/auth/verify-email", { params: { token } });
  return data;
}

export async function resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
  const { data } = await api.post<ResendVerificationResponse>("/auth/resend-verification", { email });
  return data;
}

export interface MessageResponse {
  message: string;
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/reset-password", { token, new_password: newPassword });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

// ---- Student progress tracking (real, persisted, scoped to the signed-in
// account by the backend — see app/api/progress.py) ----

export type Domain = "nlp" | "dl";

export interface DomainProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface Badge {
  key: string;
  label: string;
  description: string;
}

export interface ActivityItem {
  activity_type: string;
  domain: Domain | null;
  activity_reference: string | null;
  detail: string | null;
  timestamp: string;
}

export interface ProgressEntry {
  id: number;
  domain: Domain;
  module_id: string;
  task_id: string;
  status: string;
  completion_percentage: number;
  completed_at: string | null;
  updated_at: string;
}

export interface QuizResult {
  id: number;
  domain: Domain;
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  attempted_at: string;
}

export interface MySummary {
  nlp_progress: DomainProgress;
  dl_progress: DomainProgress;
  completed_tasks: number;
  quiz_attempts: number;
  average_quiz_score: number | null;
  badges: Badge[];
  recent_activity: ActivityItem[];
  completed_module_ids: { nlp: string[]; dl: string[] };
}

export async function recordLessonComplete(domain: Domain, moduleId: string): Promise<ProgressEntry> {
  const { data } = await api.post<ProgressEntry>("/progress/complete", {
    domain,
    module_id: moduleId,
    task_id: "page",
    status: "completed",
    completion_percentage: 100,
  });
  return data;
}

export async function recordQuizResult(
  domain: Domain,
  quizId: string,
  totalQuestions: number,
  correctAnswers: number
): Promise<QuizResult> {
  const { data } = await api.post<QuizResult>("/progress/quiz-result", {
    domain,
    quiz_id: quizId,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
  });
  return data;
}

export async function fetchMySummary(): Promise<MySummary> {
  const { data } = await api.get<MySummary>("/progress/my-summary");
  return data;
}

// ---- Teacher/Admin dashboard (role="admin" only — the backend returns a
// 403 for any other account, enforced server-side regardless of what this
// UI shows) ----

export interface StudentSummary {
  id: number;
  username: string;
  // Username/Password Authentication milestone (2026-10-07) -- most
  // students now have no email at all; see AuthUser's own comment.
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_login: string | null;
  is_verified: boolean;
  nlp_progress: DomainProgress;
  dl_progress: DomainProgress;
  quiz_attempts: number;
  average_quiz_score: number | null;
  badges_earned: number;
  last_activity_at: string | null;
}

export interface StudentListResponse {
  students: StudentSummary[];
  total: number;
}

export interface StudentDetailResponse {
  student: StudentSummary;
  nlp_entries: ProgressEntry[];
  dl_entries: ProgressEntry[];
  quiz_results: QuizResult[];
  badges: Badge[];
  activity_history: ActivityItem[];
}

export interface AdminOverview {
  total_students: number;
  active_students_7d: number;
  nlp_progress: DomainProgress;
  dl_progress: DomainProgress;
  overall_completion_percentage: number;
  total_completed_modules: number;
  total_completed_lessons: number;
  total_quiz_attempts: number;
  average_quiz_score: number | null;
  total_badges_earned: number;
  recent_activity: ActivityItem[];
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>("/admin/overview");
  return data;
}

export async function fetchAdminStudents(search?: string): Promise<StudentListResponse> {
  const { data } = await api.get<StudentListResponse>("/admin/students", { params: search ? { search } : {} });
  return data;
}

export async function fetchAdminStudentDetail(studentId: number): Promise<StudentDetailResponse> {
  const { data } = await api.get<StudentDetailResponse>(`/admin/students/${studentId}`);
  return data;
}

// ---- Real-World NLP Applications ----

export interface MatchedWord {
  word: string;
  base_polarity: number;
  negated: boolean;
  multiplier: number;
  contribution: number;
}
export interface AppPipelineStep {
  stage: string;
  detail: string;
}
export interface SentimentResponse {
  text: string;
  label: string;
  score: number;
  confidence: number;
  matched_words: MatchedWord[];
  pipeline: AppPipelineStep[];
}
export async function analyzeSentiment(text: string): Promise<SentimentResponse> {
  const { data } = await api.post<SentimentResponse>("/applications/sentiment", { text });
  return data;
}

export interface NerEntity {
  text: string;
  start: number;
  end: number;
  label: string;
  label_display?: string | null;
}
export type NerEngine = "rule_based" | "spacy";
export interface NerResponse {
  text: string;
  entities: NerEntity[];
  by_label: Record<string, string[]>;
  supported_labels: string[];
  engine: NerEngine;
}
export async function extractEntities(text: string, engine: NerEngine = "rule_based"): Promise<NerResponse> {
  const { data } = await api.post<NerResponse>("/applications/ner", { text, engine });
  return data;
}

// NER Lab Code Playground — POST /api/applications/ner-playground/run.
// See backend/app/schemas/ner_playground.py for the authoritative shapes;
// kept in exact field-for-field sync with that file on purpose.
export type NerPlaygroundStatus = "ok" | "error" | "timeout" | "memory_exceeded";

export interface NerPlaygroundEntity {
  text: string;
  label: string;
  start: number;
  end: number;
}

// kind: "started" | "nlp_called" | "nlp_result" | "print" | "completed" | "error"
// -- real events recorded during the actual sandboxed execution (see the
// backend runner's own docstring). `line` is a genuine source line number
// in the student's code when one applies, not a scripted/fake position.
export interface NerPlaygroundEvent {
  kind: string;
  line: number | null;
  detail: string | null;
}

export interface NerPlaygroundError {
  type: string;
  message: string;
  line: number | null;
}

export interface NerPlaygroundRunResponse {
  status: NerPlaygroundStatus;
  stdout: string;
  stdout_truncated: boolean;
  entities: NerPlaygroundEntity[];
  events: NerPlaygroundEvent[];
  error: NerPlaygroundError | null;
  elapsed_ms: number;
  engine: NerEngine;
}

export async function runNerPlayground(
  code: string,
  text: string,
  engine: NerEngine = "rule_based",
  signal?: AbortSignal
): Promise<NerPlaygroundRunResponse> {
  const { data } = await api.post<NerPlaygroundRunResponse>(
    "/applications/ner-playground/run",
    { code, text, engine },
    { signal }
  );
  return data;
}

export interface SentenceScore {
  index: number;
  sentence: string;
  score: number | null;
  selected: boolean;
}
export interface SummarizeResponse {
  original_text: string;
  summary: string;
  original_sentence_count: number;
  summary_sentence_count: number;
  original_word_count: number;
  summary_word_count: number;
  compression_ratio: number;
  sentence_scores: SentenceScore[];
}
export async function summarizeText(text: string, nSentences: number): Promise<SummarizeResponse> {
  const { data } = await api.post<SummarizeResponse>("/applications/summarize", { text, n_sentences: nSentences });
  return data;
}

export interface SearchResult {
  doc_id: string;
  title: string;
  snippet: string;
  relevance: number;
  matched_terms: string[];
}
export interface SearchResponse {
  query: string;
  method: string;
  corpus_size: number;
  results: SearchResult[];
}
export async function searchNlpTopics(query: string, topK = 5): Promise<SearchResponse> {
  const { data } = await api.post<SearchResponse>("/applications/search", { query, top_k: topK });
  return data;
}

export interface SpamResponse {
  subject: string;
  sender: string;
  message: string;
  classification: string;
  score: number;
  signals: string[];
  method_note: string;
}
export async function checkSpam(subject: string, message: string, sender: string): Promise<SpamResponse> {
  const { data } = await api.post<SpamResponse>("/applications/spam-check", { subject, message, sender });
  return data;
}

export interface QaEntity {
  text: string;
  start: number;
  end: number;
  label: string;
}
export interface QaSentenceScore {
  index: number;
  sentence: string;
  overlap_words: string[];
  overlap_count: number;
}
export interface QaResponse {
  context: string;
  question: string;
  question_type: string;
  answer: string | null;
  answer_sentence: string | null;
  supporting_entities: QaEntity[];
  message: string | null;
  all_sentence_scores: QaSentenceScore[];
  method_note: string;
}
export async function askQuestion(context: string, question: string): Promise<QaResponse> {
  const { data } = await api.post<QaResponse>("/applications/qa", { context, question });
  return data;
}

export interface ClassifyResponse {
  text: string;
  predicted_category: string;
  probabilities: Record<string, number>;
  categories: string[];
  training_examples_per_category: Record<string, number>;
  method_note: string;
}
export async function classifyText(text: string): Promise<ClassifyResponse> {
  const { data } = await api.post<ClassifyResponse>("/applications/classify", { text });
  return data;
}

export interface ChatResponse {
  message: string;
  matched_topic: string | null;
  answer: string;
  known_topics: string[];
  method_note: string;
}
export async function askChatbot(message: string): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/applications/chatbot", { message });
  return data;
}

// --- NLP Learning Assistant -------------------------------------------------
// A context-aware upgrade over the plain keyword chatbot above (kept intact
// for backward compatibility). Detects the student's intent (definition,
// example, code, numerical, viva, challenge, ...) against a structured NLP
// knowledge base — still explicitly rule-based, not an LLM. Conversation
// state (current topic, difficulty, pending numerical/viva answers) is an
// opaque blob the backend returns and expects back on the next call.

export type AssistantContext = Record<string, unknown>;

export type AssistantBlock =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "formula"; formula: string; explanation: string | null }
  | { type: "callout"; icon: string; text: string };

export interface AssistantRelatedLab {
  name: string;
  route: string;
}

export interface AssistantResponse {
  message: string;
  intent: string;
  topic: string | null;
  topicName: string | null;
  blocks: AssistantBlock[];
  relatedLab: AssistantRelatedLab | null;
  suggestedActions: string[];
  suggestedQuestions: string[];
  context: AssistantContext;
  methodNote: string;
}

export async function askAssistant(
  message: string,
  context: AssistantContext | null
): Promise<AssistantResponse> {
  const { data } = await api.post<AssistantResponse>("/applications/assistant", { message, context });
  return data;
}

export interface TranslateResponse {
  source_lang: string;
  target_lang: string;
  source_lang_name: string;
  target_lang_name: string;
  original_text: string;
  translated_text: string;
  service: string;
}
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<TranslateResponse> {
  const { data } = await api.post<TranslateResponse>("/applications/translate", {
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  });
  return data;
}
export async function fetchSupportedLanguages(): Promise<Record<string, string>> {
  const { data } = await api.get<{ languages: Record<string, string> }>("/applications/translate/languages");
  return data.languages;
}

export interface DocKeyword {
  word: string;
  count: number;
}
export interface DocumentAnalysisResponse {
  text: string;
  sentence_count: number;
  word_count: number;
  keywords: DocKeyword[];
  entities: NerEntity[];
  entities_by_label: Record<string, string[]>;
  sentiment: { label: string; confidence: number };
  summary: string;
  compression_ratio: number;
  pipeline: AppPipelineStep[];
}
export async function analyzeDocument(text: string): Promise<DocumentAnalysisResponse> {
  const { data } = await api.post<DocumentAnalysisResponse>("/applications/document-analysis", { text });
  return data;
}

// ---- Deep Learning Foundations ----
// A single artificial neuron's real arithmetic: forward pass, loss,
// gradient (verified against a numerical finite-difference check in the
// backend's tests), and real iterative gradient descent. See
// backend/app/algorithms/dl_foundations.py — nothing here is illustrative.

export type DlActivation = "sigmoid" | "tanh" | "relu" | "leaky_relu" | "linear";
export type DlLoss = "mse" | "binary_crossentropy";

export interface NeuronForwardResponse {
  weighted_sum: number;
  activated_output: number;
  activation: string;
  steps: string[];
}
export async function neuronForward(
  inputs: number[],
  weights: number[],
  bias: number,
  activation: DlActivation
): Promise<NeuronForwardResponse> {
  const { data } = await api.post<NeuronForwardResponse>("/dl/neuron-forward", { inputs, weights, bias, activation });
  return data;
}

export interface DlLossResponse {
  loss: number;
  loss_type: string;
  steps: string[];
}
export async function computeDlLoss(y_pred: number, y_true: number, loss_type: DlLoss): Promise<DlLossResponse> {
  const { data } = await api.post<DlLossResponse>("/dl/loss", { y_pred, y_true, loss_type });
  return data;
}

export interface DlGradientResponse {
  dl_dw: number[];
  dl_db: number;
  y_pred: number;
  loss: number;
  steps: string[];
}
export async function computeDlGradient(
  inputs: number[],
  weights: number[],
  bias: number,
  y_true: number,
  activation: DlActivation,
  loss_type: DlLoss
): Promise<DlGradientResponse> {
  const { data } = await api.post<DlGradientResponse>("/dl/gradient", {
    inputs,
    weights,
    bias,
    y_true,
    activation,
    loss_type,
  });
  return data;
}

export interface DlGradientDescentStep {
  epoch: number;
  weights: number[];
  bias: number;
  y_pred: number;
  loss: number;
}
export interface DlGradientDescentResponse {
  steps: DlGradientDescentStep[];
  final_weights: number[];
  final_bias: number;
  final_loss: number;
}
// ---- Activation Function Visualizer ----
// A live graph is the same activate() function evaluated at many points —
// see backend/app/algorithms/activation_functions.py, shared with DL
// Foundations' neuron calculators so both compute identically.

export type CurveActivation = "sigmoid" | "tanh" | "relu" | "leaky_relu";

export interface ActivationCurvePoint {
  z: number;
  y: number;
}
export interface ActivationCurveResponse {
  activation: string;
  points: ActivationCurvePoint[];
}
export async function fetchActivationCurve(
  activation: CurveActivation,
  z_min: number,
  z_max: number,
  num_points: number
): Promise<ActivationCurveResponse> {
  const { data } = await api.post<ActivationCurveResponse>("/dl/activation-curve", {
    activation,
    z_min,
    z_max,
    num_points,
  });
  return data;
}

export interface ActivationPointResponse {
  activation: string;
  z: number;
  y: number;
  derivative: number;
}
export async function fetchActivationPoint(activation: CurveActivation, z: number): Promise<ActivationPointResponse> {
  const { data } = await api.post<ActivationPointResponse>("/dl/activation-point", { activation, z });
  return data;
}

export interface SoftmaxResponse {
  input: number[];
  output: number[];
  steps: string[];
}
export async function computeSoftmax(values: number[]): Promise<SoftmaxResponse> {
  const { data } = await api.post<SoftmaxResponse>("/dl/softmax", { values });
  return data;
}

// ---- Neural Network Playground ----
// A real multi-layer feedforward network — random (but real, freshly
// generated) weight initialization, then a real forward pass computed
// layer by layer. See backend/app/algorithms/neural_network.py.

export interface NnLayerSpec {
  size: number;
  activation: CurveActivation;
}

export interface NnLayerWeights {
  weights: number[][];
  biases: number[];
  activation: string;
}

export interface RandomNetworkResponse {
  input_size: number;
  layers: NnLayerWeights[];
}
export async function generateRandomNetwork(
  inputSize: number,
  layers: NnLayerSpec[],
  seed?: number
): Promise<RandomNetworkResponse> {
  const { data } = await api.post<RandomNetworkResponse>("/dl/network/random", {
    input_size: inputSize,
    layers,
    seed: seed ?? null,
  });
  return data;
}

export interface NnNeuronActivation {
  z: number;
  output: number;
}
export interface NnLayerActivation {
  activation: string;
  neurons: NnNeuronActivation[];
}
export interface ForwardPropagationResponse {
  input_values: number[];
  layers: NnLayerActivation[];
  output: number[];
}
export async function runForwardPropagation(
  inputSize: number,
  layers: NnLayerWeights[],
  inputs: number[]
): Promise<ForwardPropagationResponse> {
  const { data } = await api.post<ForwardPropagationResponse>("/dl/network/forward", {
    input_size: inputSize,
    layers,
    inputs,
  });
  return data;
}

export async function runDlGradientDescent(
  inputs: number[],
  weights: number[],
  bias: number,
  y_true: number,
  activation: DlActivation,
  loss_type: DlLoss,
  learning_rate: number,
  epochs: number
): Promise<DlGradientDescentResponse> {
  const { data } = await api.post<DlGradientDescentResponse>("/dl/gradient-descent", {
    inputs,
    weights,
    bias,
    y_true,
    activation,
    loss_type,
    learning_rate,
    epochs,
  });
  return data;
}

// CNN Lab — real 2D convolution, activation, pooling, flatten, and a real
// dense+softmax classification head, chained into one pipeline. See
// backend/app/algorithms/cnn.py.

export interface PresetKernelsResponse {
  kernels: Record<string, number[][]>;
}
export async function fetchPresetKernels(): Promise<PresetKernelsResponse> {
  const { data } = await api.get<PresetKernelsResponse>("/dl/cnn/kernels");
  return data;
}

export interface ConvolveResponse {
  feature_map: number[][];
}
export async function runConvolve(
  image: number[][],
  kernel: number[][],
  stride: number
): Promise<ConvolveResponse> {
  const { data } = await api.post<ConvolveResponse>("/dl/cnn/convolve", { image, kernel, stride });
  return data;
}

export interface PoolResponse {
  pooled: number[][];
}
export async function runPool(
  matrix: number[][],
  poolType: "max" | "avg",
  size: number,
  stride: number
): Promise<PoolResponse> {
  const { data } = await api.post<PoolResponse>("/dl/cnn/pool", {
    matrix,
    pool_type: poolType,
    size,
    stride,
  });
  return data;
}

export interface CnnDenseWeights {
  weights: number[][];
  biases: number[];
}
export async function generateRandomDense(
  inputSize: number,
  outputSize: number,
  seed?: number
): Promise<CnnDenseWeights> {
  const { data } = await api.post<CnnDenseWeights>("/dl/cnn/random-dense", {
    input_size: inputSize,
    output_size: outputSize,
    seed: seed ?? null,
  });
  return data;
}

export interface CnnForwardResponse {
  feature_map: number[][];
  activated_map: number[][];
  pooled_map: number[][];
  flattened: number[];
  dense_z: number[];
  class_scores: number[];
  class_labels: string[];
  predicted_class: string;
}
export async function runCnnForward(
  image: number[][],
  kernel: number[][],
  convStride: number,
  convActivation: CurveActivation,
  poolType: "max" | "avg",
  poolSize: number,
  poolStride: number,
  dense: CnnDenseWeights,
  classLabels: string[]
): Promise<CnnForwardResponse> {
  const { data } = await api.post<CnnForwardResponse>("/dl/cnn/forward", {
    image,
    kernel,
    conv_stride: convStride,
    conv_activation: convActivation,
    pool_type: poolType,
    pool_size: poolSize,
    pool_stride: poolStride,
    dense,
    class_labels: classLabels,
  });
  return data;
}

// RNN & LSTM Lab — a real Elman-RNN recurrence (hidden state genuinely
// feeds back into the next timestep) and a real LSTM cell's four gates
// (forget/input/candidate/output), computed step by step over a short
// sequence. See backend/app/algorithms/rnn.py.

export interface RnnWeightsIO {
  w_xh: number[][];
  w_hh: number[][];
  b_h: number[];
  w_hy: number[][];
  b_y: number[];
}
export async function generateRandomRnn(
  inputSize: number,
  hiddenSize: number,
  outputSize: number,
  seed?: number
): Promise<RnnWeightsIO> {
  const { data } = await api.post<RnnWeightsIO>("/dl/rnn/random", {
    input_size: inputSize,
    hidden_size: hiddenSize,
    output_size: outputSize,
    seed: seed ?? null,
  });
  return data;
}

export interface RnnStepOut {
  x: number[];
  z_h: number[];
  h: number[];
  y: number[];
}
export interface RnnForwardResponse {
  steps: RnnStepOut[];
  final_hidden: number[];
}
export async function runRnnForward(
  weights: RnnWeightsIO,
  sequence: number[][],
  activation: CurveActivation,
  outputActivation: string
): Promise<RnnForwardResponse> {
  const { data } = await api.post<RnnForwardResponse>("/dl/rnn/forward", {
    weights,
    sequence,
    activation,
    output_activation: outputActivation,
  });
  return data;
}

export interface LstmWeightsIO {
  w_f: number[][]; u_f: number[][]; b_f: number[];
  w_i: number[][]; u_i: number[][]; b_i: number[];
  w_c: number[][]; u_c: number[][]; b_c: number[];
  w_o: number[][]; u_o: number[][]; b_o: number[];
}
export async function generateRandomLstm(
  inputSize: number,
  hiddenSize: number,
  seed?: number
): Promise<LstmWeightsIO> {
  const { data } = await api.post<LstmWeightsIO>("/dl/lstm/random", {
    input_size: inputSize,
    hidden_size: hiddenSize,
    seed: seed ?? null,
  });
  return data;
}

export interface LstmStepOut {
  x: number[];
  forget_gate: number[];
  input_gate: number[];
  candidate: number[];
  output_gate: number[];
  cell_state: number[];
  hidden_state: number[];
}
export interface LstmForwardResponse {
  steps: LstmStepOut[];
  final_hidden: number[];
  final_cell: number[];
}
export async function runLstmForward(weights: LstmWeightsIO, sequence: number[][]): Promise<LstmForwardResponse> {
  const { data } = await api.post<LstmForwardResponse>("/dl/lstm/forward", { weights, sequence });
  return data;
}

// Attention & Transformers Lab — real scaled dot-product attention:
// softmax(QK^T / sqrt(d_k))V computed exactly over a small sequence of
// token embeddings, with real (randomly initialized) Q/K/V projections.
// See backend/app/algorithms/attention.py.

export interface ProjectionWeightsIO {
  w_q: number[][];
  w_k: number[][];
  w_v: number[][];
}
export async function generateRandomProjection(
  dim: number,
  dK: number,
  dV: number,
  seed?: number
): Promise<ProjectionWeightsIO> {
  const { data } = await api.post<ProjectionWeightsIO>("/dl/attention/random-projection", {
    dim,
    d_k: dK,
    d_v: dV,
    seed: seed ?? null,
  });
  return data;
}

export interface AttentionForwardResponse {
  queries: number[][];
  keys: number[][];
  values: number[][];
  raw_scores: number[][];
  scaled_scores: number[][];
  attention_weights: number[][];
  output: number[][];
}
export async function runAttentionForward(
  embeddings: number[][],
  weights: ProjectionWeightsIO
): Promise<AttentionForwardResponse> {
  const { data } = await api.post<AttentionForwardResponse>("/dl/attention/forward", { embeddings, weights });
  return data;
}

// NLP Challenges and Deep Learning Challenges (and the my-progress/XP
// summary that powered the Dashboard stat row for the latter) were removed
// from the product 2026-10-06 — this frontend API surface went with them.
// The backend's Challenge/ChallengeAttempt tables and /api/dl/challenges*
// endpoints are intentionally still there: Concept DNA's mastery signal
// (see backend/app/services/concept_dna_service.py) reads the existing
// ChallengeAttempt rows directly, so the data layer stays even though no
// page here attempts new challenges anymore.

// ============================================================================
// DL Module 1 — Foundations of Neural Networks (M-P Neuron, Thresholding
// Logic, Perceptron, Perceptron Learning Algorithm). Every calculator here
// calls backend/app/algorithms/perceptron_foundations.py, whose numbers were
// verified against the user's uploaded chap_01.docx (see its test suite).
// ============================================================================

export interface MPNeuronResponse {
  weighted_sum: number;
  fired: boolean;
  steps: string[];
}
export async function mpNeuron(inputs: number[], weights: number[], threshold: number): Promise<MPNeuronResponse> {
  const { data } = await api.post<MPNeuronResponse>("/dl-module1/mp-neuron", { inputs, weights, threshold });
  return data;
}

export type LogicGate = "AND" | "OR" | "NOT";
export interface TruthTableRow {
  inputs: number[];
  weighted_sum: number;
  output: number;
}
export interface TruthTableResponse {
  gate: string;
  weights: number[];
  threshold: number;
  rows: TruthTableRow[];
}
export async function fetchTruthTable(gate: LogicGate): Promise<TruthTableResponse> {
  const { data } = await api.post<TruthTableResponse>("/dl-module1/truth-table", { gate });
  return data;
}

export interface PerceptronForwardResponse {
  weighted_sum: number;
  prediction: number;
  steps: string[];
}
export async function perceptronForward(inputs: number[], weights: number[], bias: number): Promise<PerceptronForwardResponse> {
  const { data } = await api.post<PerceptronForwardResponse>("/dl-module1/perceptron-forward", { inputs, weights, bias });
  return data;
}

export interface PLAStepResponse {
  weighted_sum: number;
  prediction: number;
  error: number;
  updated_weights: number[];
  updated_bias: number;
  steps: string[];
}
export async function perceptronLearningStep(
  inputs: number[],
  weights: number[],
  bias: number,
  target: number,
  learning_rate: number
): Promise<PLAStepResponse> {
  const { data } = await api.post<PLAStepResponse>("/dl-module1/pla-step", {
    inputs,
    weights,
    bias,
    target,
    learning_rate,
  });
  return data;
}

export interface PLATrainExample {
  inputs: number[];
  target: number;
}
export interface PLATrainStepOut {
  epoch: number;
  total_errors: number;
  weights: number[];
  bias: number;
}
export interface PLATrainResponse {
  converged: boolean;
  epochs_run: number;
  final_weights: number[];
  final_bias: number;
  history: PLATrainStepOut[];
}
export async function trainPerceptron(
  training_data: PLATrainExample[],
  initial_weights: number[],
  initial_bias: number,
  learning_rate: number,
  max_epochs = 20
): Promise<PLATrainResponse> {
  const { data } = await api.post<PLATrainResponse>("/dl-module1/pla-train", {
    training_data,
    initial_weights,
    initial_bias,
    learning_rate,
    max_epochs,
  });
  return data;
}

// ============================================================================
// DL Module 2 — Neural Networks & Backpropagation. Calls
// backend/app/algorithms/nn_module2_examples.py: a real ReLU/sigmoid email
// classifier and a real 5-node backprop worked example, both verified
// against the exact numbers in the user's uploaded Neural_network_chap-2.docx
// (the backprop network's weights were read off the doc's own diagram).
// ============================================================================

export interface EmailClassificationResponse {
  h1_weighted_sum: number;
  h1_output: number;
  h2_weighted_sum: number;
  h2_output: number;
  output_weighted_sum: number;
  output_probability: number;
  is_spam: boolean;
  steps: string[];
}
export async function classifyEmail(inputs: number[]): Promise<EmailClassificationResponse> {
  const { data } = await api.post<EmailClassificationResponse>("/dl-module2/email-classification", { inputs });
  return data;
}

export interface BackpropNetwork {
  w13: number;
  w23: number;
  w14: number;
  w24: number;
  w35: number;
  w45: number;
}
export interface BackpropStepResponse {
  a3: number;
  a4: number;
  y3: number;
  y4: number;
  a5: number;
  y5: number;
  error: number;
  delta5: number;
  delta3: number;
  delta4: number;
  updated_network: BackpropNetwork;
  steps: string[];
}
export async function backpropStep(
  x1: number,
  x2: number,
  target: number,
  learning_rate: number,
  network?: BackpropNetwork
): Promise<BackpropStepResponse> {
  const { data } = await api.post<BackpropStepResponse>("/dl-module2/backprop-step", {
    x1,
    x2,
    target,
    learning_rate,
    ...(network ? { network } : {}),
  });
  return data;
}

export interface BackpropTrainResponse {
  history: BackpropStepResponse[];
  final_output: number;
  final_error: number;
  final_network: BackpropNetwork;
}
export async function backpropTrain(
  x1: number,
  x2: number,
  target: number,
  learning_rate: number,
  num_steps: number,
  network?: BackpropNetwork
): Promise<BackpropTrainResponse> {
  const { data } = await api.post<BackpropTrainResponse>("/dl-module2/backprop-train", {
    x1,
    x2,
    target,
    learning_rate,
    num_steps,
    ...(network ? { network } : {}),
  });
  return data;
}

// ============================================================================
// DL Module 3 — Autoencoders & Regularization. Calls
// backend/app/algorithms/autoencoder_concepts.py: a real linear
// encoder/decoder, MSE/BCE reconstruction loss, the sparse-AE KL-divergence
// penalty, L2 weight regularization, and genuinely-random inverted dropout —
// all matching the formulas in the user's uploaded Autoencoders_1.docx.
// ============================================================================

export interface LinearAutoencoderResponse {
  latent: number[];
  reconstruction: number[];
  mse: number;
  steps: string[];
}
export async function linearAutoencoder(
  input_vector: number[],
  encoder_weights: number[][],
  decoder_weights: number[][]
): Promise<LinearAutoencoderResponse> {
  const { data } = await api.post<LinearAutoencoderResponse>("/dl-module3/linear-autoencoder", {
    input_vector,
    encoder_weights,
    decoder_weights,
  });
  return data;
}

export interface ReconstructionLossResponse {
  mse: number;
  binary_cross_entropy: number | null;
  steps: string[];
}
export async function reconstructionLoss(original: number[], reconstructed: number[]): Promise<ReconstructionLossResponse> {
  const { data } = await api.post<ReconstructionLossResponse>("/dl-module3/reconstruction-loss", {
    original,
    reconstructed,
  });
  return data;
}

export interface SparsityPenaltyResponse {
  kl_divergence: number;
  steps: string[];
}
export async function sparsityPenalty(rho: number, rho_hat: number): Promise<SparsityPenaltyResponse> {
  const { data } = await api.post<SparsityPenaltyResponse>("/dl-module3/sparsity-penalty", { rho, rho_hat });
  return data;
}

export interface L2PenaltyResponse {
  regularization_term: number;
  penalty: number;
  gradient_contribution: number[];
  updated_weights: number[];
  steps: string[];
}
export async function l2Penalty(weights: number[], lambda: number, learning_rate = 0.1): Promise<L2PenaltyResponse> {
  const { data } = await api.post<L2PenaltyResponse>("/dl-module3/l2-penalty", { weights, lambda, learning_rate });
  return data;
}

export interface DropoutResponse {
  keep_probability: number;
  mask: number[];
  train_output: number[];
  test_output: number[];
  steps: string[];
}
export async function invertedDropout(activations: number[], drop_probability: number, seed?: number): Promise<DropoutResponse> {
  const { data } = await api.post<DropoutResponse>("/dl-module3/dropout", {
    activations,
    drop_probability,
    ...(seed !== undefined ? { seed } : {}),
  });
  return data;
}

// ---- Teacher Dashboard expansion: NLP/DL Analytics, Assessments, Needs
// Attention, Class Progress Heatmap — all real aggregates computed
// server-side from the same rows StudentSummary/StudentDetailResponse
// already draw from (see backend/app/services/admin_service.py). ----

export interface ModuleCompletion {
  module_id: string;
  label: string;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  completion_percentage: number;
}

export interface ScoreDistributionBucket {
  label: string;
  count: number;
}

export interface QuizTopicPerformance {
  quiz_id: string;
  domain: Domain;
  attempts: number;
  average_score: number;
  pass_rate_percentage: number;
}

export interface DomainAnalytics {
  domain: Domain;
  total_students: number;
  class_completion_percentage: number;
  modules: ModuleCompletion[];
  quiz_topics: QuizTopicPerformance[];
  score_distribution: ScoreDistributionBucket[];
  average_quiz_score: number | null;
  total_quiz_attempts: number;
}

export interface Assessments {
  total_attempts: number;
  average_score: number | null;
  score_distribution: ScoreDistributionBucket[];
  topic_performance: QuizTopicPerformance[];
}

export interface AttentionReason {
  code: "low_progress" | "failed_quizzes" | "incomplete_labs" | "inactivity";
  detail: string;
}

export interface AttentionItem {
  student: StudentSummary;
  reasons: AttentionReason[];
}

export interface NeedsAttention {
  students: AttentionItem[];
  generated_at: string;
}

export type HeatmapCellState = "completed" | "in_progress" | "needs_attention" | "not_started";

export interface HeatmapCell {
  module_id: string;
  state: HeatmapCellState;
}

export interface HeatmapRow {
  student_id: number;
  username: string;
  cells: HeatmapCell[];
}

export interface Heatmap {
  domain: Domain;
  module_ids: string[];
  module_labels: string[];
  rows: HeatmapRow[];
}

export async function fetchDomainAnalytics(domain: Domain): Promise<DomainAnalytics> {
  const { data } = await api.get<DomainAnalytics>(`/admin/analytics/${domain}`);
  return data;
}

export async function fetchAssessments(): Promise<Assessments> {
  const { data } = await api.get<Assessments>("/admin/assessments");
  return data;
}

export async function fetchNeedsAttention(): Promise<NeedsAttention> {
  const { data } = await api.get<NeedsAttention>("/admin/needs-attention");
  return data;
}

export async function fetchHeatmap(domain: Domain): Promise<Heatmap> {
  const { data } = await api.get<Heatmap>(`/admin/heatmap/${domain}`);
  return data;
}

// ---------------------------------------------------------------------------
// Community / Chat milestone — private 1:1 messaging + subject-focused
// discussions. Mirrors the backend's app/schemas/chat.py and
// app/schemas/community.py field-for-field (reuses AuthUser for "what a
// user looks like" exactly the way the backend reuses UserOut), so these
// interfaces are never a guess at the response shape.

export interface UserSearchResult extends AuthUser {
  is_online: boolean;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  read_at: string | null;
}

export interface ConversationSummary {
  id: number;
  other_user: AuthUser;
  is_online: boolean;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessageListResponse {
  conversation_id: number;
  other_user: AuthUser;
  is_online: boolean;
  messages: ChatMessage[];
  has_more: boolean;
}

export async function searchChatUsers(query: string): Promise<UserSearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await api.get<{ users: UserSearchResult[] }>("/chat/users/search", { params: { q: query } });
  return data.users;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<{ conversations: ConversationSummary[] }>("/chat/conversations");
  return data.conversations;
}

export async function startConversation(otherUserId: number): Promise<MessageListResponse> {
  const { data } = await api.post<MessageListResponse>("/chat/conversations", { other_user_id: otherUserId });
  return data;
}

export async function fetchMessages(conversationId: number, beforeId?: number): Promise<MessageListResponse> {
  const { data } = await api.get<MessageListResponse>(`/chat/conversations/${conversationId}/messages`, {
    params: beforeId ? { before_id: beforeId } : undefined,
  });
  return data;
}

export async function sendChatMessage(conversationId: number, content: string): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { content });
  return data;
}

export async function markConversationRead(conversationId: number): Promise<number> {
  const { data } = await api.post<{ marked_read: number }>(`/chat/conversations/${conversationId}/read`);
  return data.marked_read;
}

export async function editChatMessage(messageId: number, content: string): Promise<ChatMessage> {
  const { data } = await api.patch<ChatMessage>(`/chat/messages/${messageId}`, { content });
  return data;
}

export async function deleteChatMessage(messageId: number): Promise<ChatMessage> {
  const { data } = await api.delete<ChatMessage>(`/chat/messages/${messageId}`);
  return data;
}

// --- Community / Discussions ------------------------------------------------

export interface CommunityTopic {
  name: string;
  default_module_id: string | null;
}

export interface CommunityTopicsResponse {
  nlp: CommunityTopic[];
  dl: CommunityTopic[];
}

export interface DiscussionReply {
  id: number;
  discussion_id: number;
  author: AuthUser;
  author_is_teacher: boolean;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  is_accepted: boolean;
  helpful_count: number;
  reacted_by_me: boolean;
}

export interface DiscussionSummary {
  id: number;
  title: string;
  domain: Domain;
  topic: string;
  linked_module_id: string | null;
  status: "open" | "answered";
  author: AuthUser;
  reply_count: number;
  has_teacher_reply: boolean;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscussionDetail extends DiscussionSummary {
  description: string;
  accepted_reply_id: number | null;
  replies: DiscussionReply[];
}

export interface NotificationItem {
  id: number;
  notif_type:
    | "message"
    | "reply"
    | "mention"
    | "accepted_answer"
    | "teacher_response"
    // Birthday Experience milestone — reuses this same notification
    // system (point 19: "do not create a separate notification system").
    | "birthday"
    | "birthday_wish";
  reference_type: "conversation" | "discussion" | "user";
  reference_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  actor: AuthUser | null;
}

export async function fetchCommunityTopics(): Promise<CommunityTopicsResponse> {
  const { data } = await api.get<CommunityTopicsResponse>("/community/topics");
  return data;
}

export interface DiscussionFilters {
  domain?: Domain;
  topic?: string;
  status?: "open" | "answered";
  mine?: boolean;
  participated?: boolean;
  saved?: boolean;
  teacher_responded?: boolean;
}

export async function fetchDiscussions(filters: DiscussionFilters = {}): Promise<DiscussionSummary[]> {
  const { data } = await api.get<{ discussions: DiscussionSummary[]; total: number }>("/community/discussions", {
    params: filters,
  });
  return data.discussions;
}

export async function createDiscussion(payload: {
  title: string;
  description: string;
  domain: Domain;
  topic: string;
  linked_module_id?: string | null;
}): Promise<DiscussionDetail> {
  const { data } = await api.post<DiscussionDetail>("/community/discussions", payload);
  return data;
}

export async function fetchDiscussion(discussionId: number): Promise<DiscussionDetail> {
  const { data } = await api.get<DiscussionDetail>(`/community/discussions/${discussionId}`);
  return data;
}

export async function createDiscussionReply(discussionId: number, content: string): Promise<DiscussionReply> {
  const { data } = await api.post<DiscussionReply>(`/community/discussions/${discussionId}/replies`, { content });
  return data;
}

export async function acceptDiscussionReply(discussionId: number, replyId: number): Promise<DiscussionDetail> {
  const { data } = await api.post<DiscussionDetail>(`/community/discussions/${discussionId}/accept`, {
    reply_id: replyId,
  });
  return data;
}

export async function toggleSavedDiscussion(discussionId: number): Promise<boolean> {
  const { data } = await api.post<{ saved: boolean }>(`/community/discussions/${discussionId}/save`);
  return data.saved;
}

export async function fetchNotifications(unreadOnly = false): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
  const { data } = await api.get<{ notifications: NotificationItem[]; unread_count: number }>(
    "/community/notifications",
    { params: { unread_only: unreadOnly } }
  );
  return data;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await api.post(`/community/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/community/notifications/read-all");
}


export async function toggleHelpfulReaction(replyId: number): Promise<{ reacted: boolean; helpful_count: number }> {
  const { data } = await api.post<{ reacted: boolean; helpful_count: number }>(`/community/replies/${replyId}/reactions`);
  return data;
}

export async function reportContent(
  targetType: "message" | "discussion" | "reply" | "user",
  targetId: number,
  reason: string
): Promise<void> {
  await api.post("/community/reports", { target_type: targetType, target_id: targetId, reason });
}

export interface BlockedUser {
  id: number;
  username: string;
}

export async function blockUser(userId: number): Promise<void> {
  await api.post("/chat/block", { user_id: userId });
}

export async function unblockUser(userId: number): Promise<void> {
  await api.delete(`/chat/block/${userId}`);
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await api.get<BlockedUser[]>("/chat/blocked");
  return data;
}


// ---------------------------------------------------------------------------
// Super Admin Portal (/api/superadmin/*) — the one centrally-managing role
// above Student and Teacher. Every type below mirrors app/schemas/
// superadmin.py exactly; none of them ever carries a password, password
// hash, raw JWT, or any other secret (see that file's own module docstring).
// ---------------------------------------------------------------------------

export interface PlatformOverview {
  total_students: number;
  total_teachers: number;
  active_users: number;
  online_now: number;
  registered_this_week: number;
  nlp_activity_count: number;
  dl_activity_count: number;
  completed_labs_count: number;
  quiz_activity_count: number;
  community_activity_count: number;
  open_reports_count: number;
}

export interface RecentEvent {
  kind: "audit" | "login_failed" | "report_filed";
  summary: string;
  created_at: string;
}

export interface SuperAdminOverview {
  stats: PlatformOverview;
  recent_events: RecentEvent[];
}

export async function fetchSuperAdminOverview(): Promise<SuperAdminOverview> {
  const { data } = await api.get<SuperAdminOverview>("/superadmin/overview");
  return data;
}

export interface SuperAdminAccountSummary {
  id: number;
  username: string;
  // Username/Password Authentication milestone (2026-10-07) -- most
  // accounts now have no email at all; see AuthUser's own comment. Still
  // populated for an account created directly via createSuperAdminTeacher.
  email: string | null;
  full_name: string | null;
  role: string;
  account_status: "active" | "suspended" | "deactivated";
  created_at: string;
  last_login: string | null;
  is_online: boolean;
}

export interface SuperAdminStudentSummary extends SuperAdminAccountSummary {
  nlp_progress_pct: number;
  dl_progress_pct: number;
  completed_labs_count: number;
  quiz_attempts_count: number;
}

export interface SuperAdminStudentDetail extends SuperAdminStudentSummary {
  is_verified: boolean;
}

export interface SuperAdminStudentListResponse {
  students: SuperAdminStudentSummary[];
  total: number;
}

export async function fetchSuperAdminStudents(search?: string): Promise<SuperAdminStudentListResponse> {
  const { data } = await api.get<SuperAdminStudentListResponse>("/superadmin/students", {
    params: search ? { search } : {},
  });
  return data;
}

export async function fetchSuperAdminStudentDetail(studentId: number): Promise<SuperAdminStudentDetail> {
  const { data } = await api.get<SuperAdminStudentDetail>(`/superadmin/students/${studentId}`);
  return data;
}

export interface SuperAdminTeacherSummary extends SuperAdminAccountSummary {
  assigned_domain: "nlp" | "dl" | null;
  is_verified: boolean;
}

export async function fetchSuperAdminTeachers(): Promise<{ teachers: SuperAdminTeacherSummary[] }> {
  const { data } = await api.get<{ teachers: SuperAdminTeacherSummary[] }>("/superadmin/teachers");
  return data;
}

export async function fetchSuperAdminTeacherDetail(teacherId: number): Promise<SuperAdminTeacherSummary> {
  const { data } = await api.get<SuperAdminTeacherSummary>(`/superadmin/teachers/${teacherId}`);
  return data;
}

export async function createSuperAdminTeacher(payload: {
  username: string;
  email: string;
  password: string;
  assigned_domain: "nlp" | "dl" | null;
}): Promise<SuperAdminTeacherSummary> {
  const { data } = await api.post<SuperAdminTeacherSummary>("/superadmin/teachers", payload);
  return data;
}

// Student/Teacher self-serve signup follow-up (2026-10-07). A "request"
// is just a role="student" account that picked "Teacher" at signup (see
// AuthUser.teacher_request_pending) — these three calls are the only way,
// anywhere in the frontend, to turn one into a real teacher account
// (createSuperAdminTeacher above is unrelated — that's a Super Admin
// typing in a brand new teacher's details directly, unchanged).
export type SuperAdminTeacherRequest = SuperAdminAccountSummary;

export async function fetchSuperAdminTeacherRequests(): Promise<{ requests: SuperAdminTeacherRequest[] }> {
  const { data } = await api.get<{ requests: SuperAdminTeacherRequest[] }>("/superadmin/teacher-requests");
  return data;
}

export async function approveSuperAdminTeacherRequest(
  userId: number,
  assignedDomain: "nlp" | "dl" | null
): Promise<SuperAdminTeacherSummary> {
  const { data } = await api.post<SuperAdminTeacherSummary>(`/superadmin/teacher-requests/${userId}/approve`, {
    assigned_domain: assignedDomain,
  });
  return data;
}

export async function rejectSuperAdminTeacherRequest(userId: number): Promise<{ id: number; message: string }> {
  const { data } = await api.post<{ id: number; message: string }>(`/superadmin/teacher-requests/${userId}/reject`, {});
  return data;
}

export async function updateSuperAdminAccountStatus(
  userId: number,
  status: "active" | "suspended" | "deactivated",
  reason: string
): Promise<{ id: number; account_status: string; message: string }> {
  const { data } = await api.patch<{ id: number; account_status: string; message: string }>(
    `/superadmin/users/${userId}/status`,
    { status, reason }
  );
  return data;
}

export interface SuperAdminPasswordResetResult {
  message: string;
  email_status: string;
  // Username/Password Authentication milestone (2026-10-07) -- populated
  // only when the target account has no email on file, in which case the
  // backend generates a real new password directly instead of emailing a
  // reset link (there's nothing to email it to). See
  // superadmin_service.trigger_password_reset's own comment.
  temporary_password: string | null;
}

export async function triggerSuperAdminPasswordReset(userId: number): Promise<SuperAdminPasswordResetResult> {
  const { data } = await api.post<SuperAdminPasswordResetResult>(`/superadmin/users/${userId}/reset-password`);
  return data;
}

export interface SuperAdminLoginActivity {
  id: number;
  email_attempted: string;
  success: boolean;
  failure_reason: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface SuperAdminSuspiciousActivity {
  email_attempted: string;
  failed_count: number;
  window_minutes: number;
}

export interface SuperAdminSession {
  id: number;
  user_id: number;
  username: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export interface SuperAdminSecurityOverview {
  login_activity: SuperAdminLoginActivity[];
  failed_login_count_24h: number;
  suspicious: SuperAdminSuspiciousActivity[];
  active_sessions: SuperAdminSession[];
}

export async function fetchSuperAdminSecurityOverview(): Promise<SuperAdminSecurityOverview> {
  const { data } = await api.get<SuperAdminSecurityOverview>("/superadmin/security/overview");
  return data;
}

export async function revokeSuperAdminSession(sessionId: number): Promise<{ id: number; message: string }> {
  const { data } = await api.delete<{ id: number; message: string }>(`/superadmin/security/sessions/${sessionId}`);
  return data;
}

export interface SuperAdminAuditLogEntry {
  id: number;
  actor_username: string;
  action_type: string;
  target_username: string | null;
  details: string | null;
  created_at: string;
}

export interface SuperAdminAuditLogResponse {
  entries: SuperAdminAuditLogEntry[];
  total: number;
}

export async function fetchSuperAdminAuditLog(
  actionType?: string,
  page = 1
): Promise<SuperAdminAuditLogResponse> {
  const { data } = await api.get<SuperAdminAuditLogResponse>("/superadmin/audit-log", {
    params: { page, ...(actionType ? { action_type: actionType } : {}) },
  });
  return data;
}

export interface SuperAdminReport {
  id: number;
  reporter_username: string;
  target_type: "message" | "discussion" | "reply" | "user";
  target_id: number;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  reviewed_by_username: string | null;
  reviewed_at: string | null;
}

export async function fetchSuperAdminReports(
  status?: "open" | "reviewed" | "dismissed"
): Promise<{ reports: SuperAdminReport[] }> {
  const { data } = await api.get<{ reports: SuperAdminReport[] }>("/superadmin/moderation/reports", {
    params: status ? { status } : {},
  });
  return data;
}

export interface SuperAdminReportContent {
  target_type: string;
  target_id: number;
  author_username: string;
  content: string;
  created_at: string;
}

export async function fetchSuperAdminReportContent(reportId: number): Promise<SuperAdminReportContent> {
  const { data } = await api.get<SuperAdminReportContent>(`/superadmin/moderation/reports/${reportId}/content`);
  return data;
}

export async function resolveSuperAdminReport(
  reportId: number,
  payload: { resolution: "reviewed" | "dismissed"; action?: "suspend_user" | null; note?: string | null }
): Promise<{ id: number; message: string }> {
  const { data } = await api.post<{ id: number; message: string }>(
    `/superadmin/moderation/reports/${reportId}/resolve`,
    payload
  );
  return data;
}

export interface SuperAdminSettings {
  pbkdf2_iterations: number;
  session_lifetime_hours: number;
  super_admin_session_lifetime_hours: number;
  login_rate_limit_max_attempts: number;
  login_rate_limit_window_minutes: number;
  chat_rate_limit_max_actions: number;
  chat_rate_limit_window_seconds: number;
  needs_attention_stale_days: number;
  needs_attention_low_progress_pct: number;
  quiz_pass_score: number;
  email_delivery_configured: boolean;
}

export async function fetchSuperAdminSettings(): Promise<SuperAdminSettings> {
  const { data } = await api.get<SuperAdminSettings>("/superadmin/settings");
  return data;
}

export interface SuperAdminLearningActivityPoint {
  date: string;
  nlp_count: number;
  dl_count: number;
}

export interface SuperAdminCommunityActivityPoint {
  date: string;
  discussions: number;
  replies: number;
  messages: number;
}

export interface SuperAdminLearningActivity {
  daily_activity: SuperAdminLearningActivityPoint[];
  daily_community: SuperAdminCommunityActivityPoint[];
  quiz_pass_rate_pct: number;
  total_quiz_attempts: number;
  total_completed_labs: number;
}

export async function fetchSuperAdminLearningActivity(): Promise<SuperAdminLearningActivity> {
  const { data } = await api.get<SuperAdminLearningActivity>("/superadmin/learning-activity");
  return data;
}

// ---------------------------------------------------------------------------
// Birthday Experience milestone — mirrors backend/app/schemas/birthday.py
// and app/api/birthday.py field-for-field, the same way the chat/community
// interfaces above mirror their own schema files. /users/me/birthday is the
// ONE endpoint in this whole API that ever returns a real date of birth —
// everything else (BirthdayStatus, RelatedBirthday) is a derived boolean,
// never the raw date (see that schema file's own docstring for why).

export interface BirthdayMe {
  birthday: string | null; // "YYYY-MM-DD", owner-only
  timezone: string;
  is_birthday_today: boolean;
}

export async function fetchMyBirthday(): Promise<BirthdayMe> {
  const { data } = await api.get<BirthdayMe>("/users/me/birthday");
  return data;
}

export async function updateMyBirthday(birthday: string | null, timezone?: string | null): Promise<BirthdayMe> {
  const { data } = await api.patch<BirthdayMe>("/users/me/birthday", { birthday, timezone: timezone || null });
  return data;
}

export interface RelatedBirthday {
  user_id: number;
  username: string;
  relationship: "chat" | "teacher" | "student";
}

export interface BirthdayStatus {
  is_my_birthday: boolean;
  related_birthdays_today: RelatedBirthday[];
}

export async function fetchBirthdayToday(): Promise<BirthdayStatus> {
  const { data } = await api.get<BirthdayStatus>("/birthday/today");
  return data;
}

export interface BirthdayWish {
  from_username: string;
  from_role: "friend" | "teacher";
  message: string;
  created_at: string;
}

export async function fetchBirthdayWishes(): Promise<BirthdayWish[]> {
  const { data } = await api.get<{ wishes: BirthdayWish[] }>("/birthday/wishes");
  return data.wishes;
}

// Delivered as a real chat message (see birthday_service.send_wish) — the
// response is a genuine ChatMessage, not a special "wish" shape, so the
// conversation thread can render it exactly like any other message.
export async function sendBirthdayWish(toUserId: number, message: string): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>("/birthday/wish", { to_user_id: toUserId, message });
  return data;
}

// ---------------------------------------------------------------------------
// Concept DNA milestone — mirrors backend/app/schemas/concept_dna.py
// field-for-field. One endpoint returns everything the page needs (hero
// summary, the graph's nodes/edges, the weak-concept radar, the
// recommendation, and cross-domain highlights) — see that schema file's
// own docstring for why this isn't split into several endpoints.

export type ConceptStatus = "strong" | "developing" | "needs_attention" | "not_started" | "locked";
export type ConceptRelationshipType = "prerequisite" | "related";

export interface ConceptState {
  id: string;
  label: string;
  domain: Domain;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  route: string;
  status: ConceptStatus;
  mastery_score: number;
  prerequisite_ids: string[];
  related_ids: string[];
  completed: boolean;
  quiz_attempts: number;
  quiz_average_score: number | null;
  challenge_attempts: number;
  challenge_correct: number;
}

export interface ConceptEdge {
  source_id: string;
  target_id: string;
  relationship_type: ConceptRelationshipType;
  cross_domain: boolean;
  completed_both: boolean;
}

export interface ConceptSummary {
  total_concepts: number;
  strong: number;
  developing: number;
  needs_attention: number;
  not_started: number;
  locked: number;
  cross_domain_connections: number;
}

export interface WeakConcept {
  id: string;
  label: string;
  domain: Domain;
  mastery_score: number;
  reasons: string[];
  route: string;
}

export interface ConceptRecommendation {
  concept_id: string | null;
  label: string | null;
  route: string | null;
  reason: string;
}

export interface CrossDomainHighlight {
  path_ids: string[];
  path_labels: string[];
  narrative: string;
}

export interface ConceptDnaResponse {
  summary: ConceptSummary;
  concepts: ConceptState[];
  edges: ConceptEdge[];
  weak_concepts: WeakConcept[];
  recommendation: ConceptRecommendation | null;
  cross_domain_highlights: CrossDomainHighlight[];
  has_any_activity: boolean;
}

export async function fetchConceptDna(): Promise<ConceptDnaResponse> {
  const { data } = await api.get<ConceptDnaResponse>("/concept-dna");
  return data;
}

// Digital Books milestone (theory migration) — reading progress + bookmark
// endpoints. See backend/app/models/orm_models.py's BookProgress docstring
// for why this is its own small surface rather than folded into the
// lesson-completion endpoints above.
export interface BookProgressEntry {
  chapter_id: string;
  completed: boolean;
  bookmarked: boolean;
  last_page_in_chapter: number;
  updated_at: string;
}

export interface BookProgressSummary {
  book_id: "nlp" | "dl";
  completed_chapters: number;
  total_chapters: number;
  percentage: number;
  resume_chapter_id: string | null;
  resume_page_in_chapter: number;
  entries: BookProgressEntry[];
}

export async function fetchBookProgress(bookId: "nlp" | "dl"): Promise<BookProgressSummary> {
  const { data } = await api.get<BookProgressSummary>(`/books/${bookId}/progress`);
  return data;
}

export async function recordBookProgress(
  bookId: "nlp" | "dl",
  chapterId: string,
  completed: boolean,
  lastPageInChapter: number,
): Promise<BookProgressEntry> {
  const { data } = await api.post<BookProgressEntry>("/books/progress", {
    book_id: bookId,
    chapter_id: chapterId,
    completed,
    last_page_in_chapter: lastPageInChapter,
  });
  return data;
}

export async function toggleBookBookmark(bookId: "nlp" | "dl", chapterId: string): Promise<BookProgressEntry> {
  const { data } = await api.post<BookProgressEntry>("/books/bookmark", { book_id: bookId, chapter_id: chapterId });
  return data;
}
