from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .serializers import AskSerializer
from .services import answer_question_hybrid


class AskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid input', 'detail': serializer.errors},
                status=400,
            )

        question = serializer.validated_data['question']
        result = answer_question_hybrid(request.user, question)
        result['question'] = question
        return Response(result)