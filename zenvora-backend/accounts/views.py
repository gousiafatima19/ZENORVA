from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {'token': token.key, 'user': UserSerializer(user).data},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {'error': 'Invalid input', 'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if not user:
            return Response(
                {'error': 'Invalid credentials',
                 'detail': 'Username or password is incorrect'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {'token': token.key, 'user': UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class BudgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        remaining = (u.weekly_budget or 0) - u.actual_spend
        return Response({
            'weekly_budget': u.weekly_budget,
            'planned_spend': u.planned_spend,
            'actual_spend': u.actual_spend,
            'remaining': round(remaining, 2),
            'over_budget': remaining < 0,
        })

    def put(self, request):
        u = request.user
        budget = request.data.get('weekly_budget')
        if budget is not None:
            try:
                u.weekly_budget = float(budget)
                u.save()
            except ValueError:
                return Response(
                    {'error': 'Invalid input',
                     'detail': 'weekly_budget must be a number'},
                    status=400,
                )
        return self.get(request)


class BudgetSpendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get('amount')
        spend_type = request.data.get('type', 'actual')

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid input', 'detail': 'amount must be a number'},
                status=400,
            )

        u = request.user
        if spend_type == 'planned':
            u.planned_spend = (u.planned_spend or 0) + amount
        else:
            u.actual_spend = (u.actual_spend or 0) + amount
        u.save()

        return Response({
            'planned_spend': u.planned_spend,
            'actual_spend': u.actual_spend,
        })