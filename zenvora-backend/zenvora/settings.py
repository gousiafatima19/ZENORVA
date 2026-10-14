from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static('/assets/', document_root=str(settings.FRONTEND_DIR / 'assets'))