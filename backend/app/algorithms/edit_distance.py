"""
Levenshtein edit distance, computed with the standard dynamic-programming
algorithm and returning the full DP matrix (so the frontend can animate the
cell-by-cell fill) plus a real backtrace through that matrix to recover the
actual sequence of edit operations. Nothing here is a pre-computed number —
every matrix and every operation is derived from the two strings given.
"""
from dataclasses import dataclass, field


@dataclass
class EditOperation:
    op: str  # "match" | "substitute" | "insert" | "delete"
    source_char: str | None
    target_char: str | None
    source_index: int | None  # index into source string, or None
    target_index: int | None  # index into target string, or None


@dataclass
class EditDistanceResult:
    source: str
    target: str
    distance: int
    matrix: list[list[int]]
    operations: list[EditOperation] = field(default_factory=list)


def levenshtein(source: str, target: str) -> EditDistanceResult:
    m, n = len(source), len(target)
    # dp[i][j] = edit distance between source[:i] and target[:j]
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if source[i - 1] == target[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # deletion
                    dp[i][j - 1],      # insertion
                    dp[i - 1][j - 1],  # substitution
                )

    # Backtrace from (m, n) to (0, 0) to recover the real operation sequence
    # (one of possibly several optimal paths — ties are broken in a fixed
    # order: prefer match/substitute, then delete, then insert).
    operations: list[EditOperation] = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and source[i - 1] == target[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            operations.append(EditOperation("match", source[i - 1], target[j - 1], i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            operations.append(EditOperation("substitute", source[i - 1], target[j - 1], i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            operations.append(EditOperation("delete", source[i - 1], None, i - 1, None))
            i -= 1
        else:
            operations.append(EditOperation("insert", None, target[j - 1], None, j - 1))
            j -= 1
    operations.reverse()

    return EditDistanceResult(
        source=source,
        target=target,
        distance=dp[m][n],
        matrix=dp,
        operations=operations,
    )
