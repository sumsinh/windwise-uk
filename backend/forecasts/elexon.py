
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from math import sqrt

import requests

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

ACTUALS_URL = f"{BASE_URL}/FUELHH/stream"
FORECASTS_URL = f"{BASE_URL}/WINDFOR/stream"

UK_TZ = ZoneInfo("Europe/London")

START_DATE = date(2026, 1, 1)
END_DATE = date(2026, 2, 1)

DECISION_HOUR_UK = 10


def fetch_records(url, params):
    response = requests.get(url, params=params, timeout=120)
    response.raise_for_status()

    payload = response.json()

    if not isinstance(payload, list):
        raise ValueError(
            f"Expected a list from Elexon, got {type(payload).__name__}"
        )

    return payload


def parse_time(value):
    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    ).astimezone(timezone.utc)


def normalize_time(value):
    return (
        parse_time(value)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def uk_delivery_date(value):
    return parse_time(value).astimezone(UK_TZ).date()


def decision_cutoff(delivery_time):
    delivery_date = uk_delivery_date(delivery_time)
    previous_day = delivery_date - timedelta(days=1)

    cutoff_uk = datetime.combine(
        previous_day,
        time(hour=DECISION_HOUR_UK),
        tzinfo=UK_TZ,
    )

    return cutoff_uk.astimezone(timezone.utc)


def fetch_january_data():
    actuals = fetch_records(
        ACTUALS_URL,
        {
            "settlementDateFrom": "2026-01-01",
            "settlementDateTo": "2026-01-31",
            "fuelType": "WIND",
        },
    )

    forecasts = fetch_records(
        FORECASTS_URL,
        {
            "publishDateTimeFrom": "2025-12-30T00:00:00Z",
            "publishDateTimeTo": "2026-02-01T00:00:00Z",
        },
    )

    actuals = [
        row
        for row in actuals
        if row.get("fuelType") == "WIND"
        and row.get("startTime")
        and row.get("generation") is not None
        and row.get("settlementDate")
        and START_DATE
        <= date.fromisoformat(row["settlementDate"])
        < END_DATE
    ]

    forecasts = [
        row
        for row in forecasts
        if row.get("startTime")
        and row.get("publishTime")
        and row.get("generation") is not None
        and START_DATE
        <= uk_delivery_date(row["startTime"])
        < END_DATE
    ]

    print(f"January actual records: {len(actuals)}")
    print(f"January delivery forecast records: {len(forecasts)}")

    return actuals, forecasts


def calculate_accuracy(actuals, forecasts):
    actual_by_time = {
        normalize_time(row["startTime"]): float(row["generation"])
        for row in actuals
    }

    selected_forecasts = {}

    for row in forecasts:
        target = normalize_time(row["startTime"])
        published = parse_time(row["publishTime"])
        cutoff = decision_cutoff(row["startTime"])

        if published > cutoff:
            continue

        current = selected_forecasts.get(target)

        if (
            current is None
            or published > parse_time(current["publishTime"])
        ):
            selected_forecasts[target] = row

    results = []

    for target, forecast in selected_forecasts.items():
        if target not in actual_by_time:
            continue

        predicted = float(forecast["generation"])
        actual = actual_by_time[target]
        error = predicted - actual

        results.append(
            {
                "startTime": target,
                "publishTime": forecast["publishTime"],
                "forecastMW": predicted,
                "actualMW": actual,
                "errorMW": round(error, 2),
                "absoluteErrorMW": round(abs(error), 2),
            }
        )

    results.sort(key=lambda item: item["startTime"])

    actual_count = len(actual_by_time)
    eligible_count = len(selected_forecasts)
    matched_count = len(results)

    minute_counts = Counter(
        parse_time(row["startTime"]).minute
        for row in results
    )

    diagnostics = {
        "actualPeriods": actual_count,
        "eligibleForecastPeriods": eligible_count,
        "matchedPeriods": matched_count,
        "unmatchedActualPeriods": actual_count - matched_count,
        "coveragePercent": round(
            100 * matched_count / actual_count, 2
        ) if actual_count else 0,
        "matchedMinuteDistribution": {
            str(minute): count
            for minute, count in sorted(minute_counts.items())
        },
        "decisionCutoff": "10:00 Europe/London on D-1",
        "cutoffIsAssumption": True,
        "forecastSelection": (
            "Latest publication at or before the decision cutoff "
            "for each available forecast target timestamp"
        ),
        "resolutionNote": (
            "Only exact forecast-to-actual timestamps are matched. "
            "Missing half-hour forecast values are not interpolated."
        ),
    }

    if not results:
        return {
            "records": [],
            "metrics": {
                "matchedPeriods": 0,
                "maeMW": None,
                "rmseMW": None,
                "biasMW": None,
            },
            "diagnostics": diagnostics,
        }

    errors = [row["errorMW"] for row in results]
    count = len(errors)

    mae = sum(abs(error) for error in errors) / count

    rmse = sqrt(
        sum(error ** 2 for error in errors) / count
    )

    bias = sum(errors) / count

    return {
        "records": results,
        "metrics": {
            "matchedPeriods": count,
            "maeMW": round(mae, 2),
            "rmseMW": round(rmse, 2),
            "biasMW": round(bias, 2),
        },
        "diagnostics": diagnostics,
    }
