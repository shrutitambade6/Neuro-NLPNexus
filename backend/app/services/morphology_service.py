from app.algorithms.morphology import morphology_breakdown, porter_stem, simple_lemmatize
from app.schemas.morphology import MorphologyResponse, WordMorphology


def run_morphology(words: list[str]) -> MorphologyResponse:
    results = []
    for word in words:
        w = word.strip()
        if not w:
            continue
        lemma_info = simple_lemmatize(w)
        breakdown = morphology_breakdown(w)
        results.append(
            WordMorphology(
                word=w,
                stem=porter_stem(w),
                lemma=lemma_info["lemma"],
                lemma_method=lemma_info["method"],
                prefix=breakdown.prefix,
                root=breakdown.root,
                suffix=breakdown.suffix,
            )
        )
    return MorphologyResponse(results=results)
