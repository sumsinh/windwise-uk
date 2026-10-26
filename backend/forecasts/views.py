
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .elexon import fetch_january_data, calculate_accuracy


@require_GET
def health_check(request):
    return JsonResponse({
        "status": "success",
        "message": "WindWise UK API is running",
    })


@require_GET
def accuracy(request):
    try:
        actuals, forecasts = fetch_january_data()
        result = calculate_accuracy(actuals, forecasts)

        result["dataSource"] = "Elexon BMRS"
        result["deliveryMonth"] = "January 2026"

        return JsonResponse(result)

    except Exception as exc:
        return JsonResponse({
            "error": "Unable to retrieve or process Elexon data.",
            "details": str(exc),
        }, status=502)
