from __future__ import annotations

import json
import math
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter


OUTPUT_DIR = Path("test-assets/scans")
WIDTH = 666
HEIGHT = 375
SAMPLE_SIZE = 96


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    specs = [
        ("upload-demo-normal-octa.png", "upload_demo_normal", 0, 72, 5, 12, 68),
        ("upload-demo-alzheimer-risk-octa.png", "upload_demo_alzheimer_risk", 0, 34, 4, 26, 68),
        ("upload-demo-quality-blocked-octa.png", "upload_demo_quality_blocked", 0, 22, 2, 42, 68),
        ("normal-control-01-octa.png", "normal_control", 0, 60, 5, 24, 34),
        ("normal-control-02-octa.png", "normal_control", 1, 60, 5, 24, 34),
        ("normal-control-03-octa.png", "normal_control", 2, 60, 5, 24, 34),
        ("autism-demo-placeholder-01-octa.png", "autism_placeholder", 10, 45, 4, 55, 12),
        ("autism-demo-placeholder-02-octa.png", "autism_placeholder", 11, 50, 4, 55, 12),
        ("autism-demo-placeholder-03-octa.png", "autism_placeholder", 12, 55, 4, 55, 12),
    ]

    records = []
    for filename, intended_label, seed, vessel_count, branch_depth, faz_radius, demo_age in specs:
        image = draw_scan(seed=seed, vessel_count=vessel_count, branch_depth=branch_depth, faz_radius=faz_radius)
        path = OUTPUT_DIR / filename
        image.save(path)
        metrics = analyze_image(image)
        classification = classify_metrics(metrics, age=demo_age)
        records.append(
            {
                "file": str(path),
                "intended_demo_label": intended_label,
                "current_app_expected_result": classification["label"],
                "demo_age_used_for_expected_result": demo_age,
                "medical_use": "synthetic demo asset only; not diagnostic; not derived from patient data",
                "metrics_for_current_app": metrics,
            }
        )

    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    (OUTPUT_DIR / "README.md").write_text(readme(records), encoding="utf-8")

    for record in records:
        metrics = record["metrics_for_current_app"]
        print(
            f"{record['file']} -> {record['intended_demo_label']} / "
            f"{record['current_app_expected_result']} "
            f"(VD {metrics['vesselDensity']}%, quality {round(metrics['qualityScore'])}%)"
        )


def draw_scan(seed: int, vessel_count: int, branch_depth: int, faz_radius: int) -> Image.Image:
    rng = Random(seed)
    image = Image.new("RGB", (WIDTH, HEIGHT), (226, 232, 230))
    draw = ImageDraw.Draw(image)

    center = (WIDTH // 2 + rng.randint(-18, 18), HEIGHT // 2 + rng.randint(-10, 10))
    radius_x = 270
    radius_y = 158
    draw.ellipse(
        [center[0] - radius_x, center[1] - radius_y, center[0] + radius_x, center[1] + radius_y],
        fill=(218, 229, 225),
        outline=(166, 184, 180),
        width=2,
    )

    for index in range(vessel_count):
        angle = (math.tau * index / max(1, vessel_count)) + rng.uniform(-0.09, 0.09)
        start_radius = rng.uniform(faz_radius + 6, faz_radius + 22)
        end_radius = rng.uniform(118, 168)
        start = (
            center[0] + math.cos(angle) * start_radius * 1.45,
            center[1] + math.sin(angle) * start_radius * 0.9,
        )
        end = (
            center[0] + math.cos(angle + rng.uniform(-0.22, 0.22)) * end_radius * 1.55,
            center[1] + math.sin(angle + rng.uniform(-0.15, 0.15)) * end_radius,
        )
        width = rng.choice([2, 2, 3, 4])
        draw_curved_vessel(draw, rng, start, end, width)
        draw_branches(draw, rng, start, end, branch_depth, width)

    draw.ellipse(
        [center[0] - faz_radius, center[1] - faz_radius, center[0] + faz_radius, center[1] + faz_radius],
        fill=(236, 240, 238),
        outline=(159, 174, 170),
        width=1,
    )

    image = add_texture(image, rng)
    return image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))


def draw_curved_vessel(draw: ImageDraw.ImageDraw, rng: Random, start: tuple[float, float], end: tuple[float, float], width: int) -> None:
    mid = ((start[0] + end[0]) / 2 + rng.uniform(-45, 45), (start[1] + end[1]) / 2 + rng.uniform(-26, 26))
    points = []
    for step in range(22):
        t = step / 21
        x = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * mid[0] + t**2 * end[0]
        y = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * mid[1] + t**2 * end[1]
        points.append((x, y))
    draw.line(points, fill=(36, 52, 55), width=width, joint="curve")


def draw_branches(
    draw: ImageDraw.ImageDraw,
    rng: Random,
    start: tuple[float, float],
    end: tuple[float, float],
    depth: int,
    base_width: int,
) -> None:
    if depth <= 0:
        return
    for _ in range(rng.randint(1, 3)):
        t = rng.uniform(0.35, 0.82)
        origin = (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)
        angle = math.atan2(end[1] - start[1], end[0] - start[0]) + rng.choice([-1, 1]) * rng.uniform(0.35, 0.95)
        length = rng.uniform(24, 58)
        branch_end = (origin[0] + math.cos(angle) * length, origin[1] + math.sin(angle) * length)
        width = max(1, base_width - 1)
        draw_curved_vessel(draw, rng, origin, branch_end, width)
        draw_branches(draw, rng, origin, branch_end, depth - 1, width)


def add_texture(image: Image.Image, rng: Random) -> Image.Image:
    pixels = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if rng.random() > 0.045:
                continue
            r, g, b = pixels[x, y]
            delta = rng.randint(-10, 10)
            pixels[x, y] = (clamp(r + delta), clamp(g + delta), clamp(b + delta))
    return image


def analyze_image(image: Image.Image) -> dict[str, float | int | str]:
    sample = image.resize((SAMPLE_SIZE, SAMPLE_SIZE)).convert("RGB")
    pixels = list(sample.getdata())
    grayscale = [r * 0.299 + g * 0.587 + b * 0.114 for r, g, b in pixels]
    total = sum(grayscale)
    dark_pixels = sum(1 for value in grayscale if value < 92)
    bright_pixels = sum(1 for value in grayscale if value > 178)
    brightness = total / len(grayscale)
    variance = sum((value - brightness) ** 2 for value in grayscale)
    edge_total = 0.0
    for y in range(1, SAMPLE_SIZE - 1):
        for x in range(1, SAMPLE_SIZE - 1):
            index = y * SAMPLE_SIZE + x
            value = grayscale[index]
            edge_total += abs(value - grayscale[index - 1]) + abs(value - grayscale[index - SAMPLE_SIZE])

    contrast = math.sqrt(variance / len(grayscale))
    sharpness = min(100, edge_total / len(grayscale) / 1.8)
    vessel_density = min(96, max(12, (dark_pixels / len(grayscale)) * 140 + contrast * 0.3))
    exposure_penalty = abs(brightness - 128) * 0.22 + (bright_pixels / len(grayscale)) * 18
    quality_score = min(99, max(42, sharpness * 0.58 + contrast * 0.42 + 68 - exposure_penalty))
    confidence_score = min(95, max(62, quality_score * 0.68 + contrast * 0.22 + 22))
    artifact_score = round(max(3, 100 - quality_score))

    vessel_density_proxy = round(vessel_density)
    perfusion_density_proxy = round(min(98, max(18, vessel_density_proxy + contrast * 0.18 - artifact_score * 0.12)))
    faz_risk_proxy = round(min(95, max(8, 70 - vessel_density_proxy + max(0, artifact_score - 12) * 0.45)))

    return {
        "artifactScore": artifact_score,
        "brightness": round(brightness),
        "confidenceScore": round(confidence_score),
        "contrast": round(contrast),
        "demoEngineVersion": "thermoeye-literature-ruleset-2026.05",
        "fazRiskProxy": faz_risk_proxy,
        "imageHeight": HEIGHT,
        "imageWidth": WIDTH,
        "perfusionDensityProxy": perfusion_density_proxy,
        "qualityScore": quality_score,
        "sharpness": round(sharpness),
        "vesselDensity": vessel_density_proxy,
    }


def classify_metrics(metrics: dict[str, float | int | str], age: int) -> dict[str, str | int]:
    quality = float(metrics["qualityScore"])
    artifact = int(metrics["artifactScore"])
    vessel_density = int(metrics["vesselDensity"])
    faz = int(metrics["fazRiskProxy"])
    perfusion = int(metrics["perfusionDensityProxy"])
    if quality < 55 or artifact > 45:
        return {"kind": "quality_blocked", "riskScore": 0, "label": "Quality blocked"}

    age_adjustment = max(0, age - 60) * 0.35
    density_signal = max(0, 50 - vessel_density) * 1.05
    faz_signal = max(0, faz - 38) * 0.55
    perfusion_signal = max(0, 50 - perfusion) * 0.65
    quality_adjustment = max(0, 74 - quality) * 0.22
    risk_score = round(min(92, max(8, 18 + age_adjustment + density_signal + faz_signal + perfusion_signal + quality_adjustment)))
    is_risk = risk_score >= 50 or vessel_density < 42 or faz >= 45 or perfusion < 44
    if is_risk:
        return {"kind": "alzheimer_risk", "riskScore": max(risk_score, 58), "label": "Alzheimer-risk screening pattern"}
    return {"kind": "normal", "riskScore": min(risk_score, 34), "label": "Normal screening pattern"}


def readme(records: list[dict[str, object]]) -> str:
    lines = [
        "# Synthetic Thermoeye Test Scans",
        "",
        "These PNG files are generated demo assets for exercising the upload and analysis workflow.",
        "They are not patient data, are not diagnostic, and must not be used as evidence for autism, Alzheimer disease, or any clinical condition.",
        "",
        "Quick upload test files:",
        "",
        "- `upload-demo-normal-octa.png`: expected `Normal screening pattern` with the default upload age 68.",
        "- `upload-demo-alzheimer-risk-octa.png`: expected `Alzheimer-risk screening pattern` with the default upload age 68.",
        "- `upload-demo-quality-blocked-octa.png`: expected `Quality blocked` with the default upload age 68.",
        "",
        "Important: the current app ruleset has only Normal, Alzheimer-risk, and Quality-blocked outcomes.",
        "Files named `autism-demo-placeholder-*` are placeholders requested for autism-flow testing, but the current app will not output Autism until the clinical ruleset and UI are changed.",
        "",
        "## Files",
        "",
    ]
    for record in records:
        metrics = record["metrics_for_current_app"]
        assert isinstance(metrics, dict)
        lines.append(
            f"- `{Path(str(record['file'])).name}`: intended demo label `{record['intended_demo_label']}`, "
            f"current app expected `{record['current_app_expected_result']}`, "
            f"demo age {record['demo_age_used_for_expected_result']}, "
            f"VD {metrics['vesselDensity']}%, quality {round(float(metrics['qualityScore']))}%."
        )
    lines.append("")
    return "\n".join(lines)


def clamp(value: int) -> int:
    return max(0, min(255, value))


if __name__ == "__main__":
    main()
