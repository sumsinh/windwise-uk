
from django.urls import path
from .views import health_check, accuracy

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("accuracy/", accuracy, name="accuracy"),
]
