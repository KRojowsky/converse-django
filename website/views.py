from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import logout
from .models import Lesson
from agora_token_builder import RtcTokenBuilder, RtmTokenBuilder
from django.conf import settings
from django.http import JsonResponse
import time



def home(request):
    return render(request, 'website/home.html')


def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('login')
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


def converse(request):
    user = request.user
    room_code = request.GET.get('room', 'main')

    context = {
        'user': user,
        'room_code': room_code
    }

    return render(request, 'website/room2.html', context)




@login_required
def get_agora_token(request):
    """
    Generuje token Agora dla zalogowanego użytkownika
    """
    if request.method == 'GET':
        try:
            # Pobierz parametry z URL
            channel_name = request.GET.get('channel', 'main')
            uid = request.GET.get('uid')

            # Jeśli nie podano UID, wygeneruj na podstawie ID użytkownika
            if not uid:
                uid = str(request.user.id * 1000 + int(time.time()) % 1000)

            # Konfiguracja tokenu
            app_id = settings.AGORA_APP_ID
            app_certificate = settings.AGORA_APP_CERTIFICATE
            role = 1  # 1 = publisher (może publikować i subskrybować)

            # Czas wygaśnięcia tokenu
            current_timestamp = int(time.time())
            privilege_expired_ts = current_timestamp + settings.AGORA_TOKEN_EXPIRE_SECONDS

            # Generowanie tokenów RTC i RTM
            rtc_token = RtcTokenBuilder.buildTokenWithUid(
                app_id,
                app_certificate,
                channel_name,
                int(uid),
                role,
                privilege_expired_ts
            )

            # Generowanie prawidłowego tokenu RTM
            try:
                from agora_token_builder.RtmTokenBuilder import RtmTokenBuilder, Role_Rtm_User
                rtm_token = RtmTokenBuilder.buildToken(
                    app_id,
                    app_certificate,
                    uid,
                    Role_Rtm_User,
                    privilege_expired_ts
                )
            except ImportError:
                rtm_token = rtc_token

            # Odpowiedź JSON
            response_data = {
                'success': True,
                'appId': app_id,
                'channelName': channel_name,
                'uid': int(uid),
                'rtcToken': rtc_token,
                'rtmToken': rtm_token,
                'expireTime': privilege_expired_ts,
                'username': request.user.username,
                'displayName': request.user.first_name or request.user.username
            }

            return JsonResponse(response_data)

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

    return JsonResponse({
        'success': False,
        'error': 'Metoda nie jest obsługiwana'
    }, status=405)


def custom_logout(request):
    logout(request)
    return redirect('login')
