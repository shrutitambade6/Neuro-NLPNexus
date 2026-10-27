from app.algorithms.pos_tagging import (
    DEFAULT_MODEL,
    TAG_DESCRIPTIONS,
    TAGS,
    TRAINING_CORPUS,
    run_viterbi,
)
from app.algorithms.tokenization import regex_tokenize
from app.schemas.pos_tagging import (
    POSTaggingResponse,
    TaggedToken,
    TokenEmission,
    TrellisCellOut,
    TrellisStepOut,
)


def round_probs(d: dict[str, float], decimals: int = 5) -> dict[str, float]:
    return {k: round(v, decimals) for k, v in d.items()}


def tag_sentence(sentence: str) -> POSTaggingResponse:
    tokens = regex_tokenize(sentence)
    model = DEFAULT_MODEL

    result = run_viterbi(tokens, model)

    unknown_tokens = [tok for tok in tokens if tok.lower() not in model.vocab]

    token_emissions = [
        TokenEmission(
            token=step.token,
            is_known=step.is_known,
            probabilities=round_probs(step.emissions),
        )
        for step in result.trellis
    ]

    trellis_out = [
        TrellisStepOut(
            token=step.token,
            is_known=step.is_known,
            cells=[
                TrellisCellOut(
                    tag=tag,
                    log_score=round(step.cells[tag].log_score, 4),
                    backpointer=step.cells[tag].backpointer,
                )
                for tag in TAGS
            ],
        )
        for step in result.trellis
    ]

    transition_matrix = [
        [round(model.transition_prob(from_tag, to_tag), 5) for to_tag in TAGS] for from_tag in TAGS
    ]
    initial_probabilities = round_probs({tag: model.initial_prob(tag) for tag in TAGS})

    tagged = [TaggedToken(token=tok, tag=tag) for tok, tag in zip(tokens, result.best_path)]

    return POSTaggingResponse(
        tokens=tokens,
        tag_set=TAGS,
        tag_descriptions=TAG_DESCRIPTIONS,
        initial_probabilities=initial_probabilities,
        transition_matrix=transition_matrix,
        token_emissions=token_emissions,
        trellis=trellis_out,
        best_path=result.best_path,
        best_path_score=round(result.best_score, 4),
        tagged=tagged,
        unknown_tokens=unknown_tokens,
        corpus_size=len(TRAINING_CORPUS),
    )
