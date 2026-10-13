from django.urls import path
from .views import RegisterView, LoginView, BudgetView, BudgetSpendView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('budget/', BudgetView.as_view(), name='budget'),
    path('budget/spend/', BudgetSpendView.as_view(), name='budget-spend'),
]