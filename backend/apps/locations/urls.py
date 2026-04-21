from rest_framework.routers import DefaultRouter

from apps.locations.views import LocationViewSet, TableViewSet, ZoneViewSet

router = DefaultRouter()
router.register("locations", LocationViewSet, basename="location")
router.register("zones", ZoneViewSet, basename="zone")
router.register("tables", TableViewSet, basename="table")

urlpatterns = router.urls
