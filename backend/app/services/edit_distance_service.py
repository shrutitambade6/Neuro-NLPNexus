from app.algorithms.edit_distance import levenshtein
from app.schemas.edit_distance import EditDistanceResponse, EditOperationOut


def run_edit_distance(source: str, target: str) -> EditDistanceResponse:
    result = levenshtein(source, target)
    return EditDistanceResponse(
        source=result.source,
        target=result.target,
        distance=result.distance,
        matrix=result.matrix,
        operations=[
            EditOperationOut(
                op=op.op,
                source_char=op.source_char,
                target_char=op.target_char,
                source_index=op.source_index,
                target_index=op.target_index,
            )
            for op in result.operations
        ],
    )
