from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import logout
from .models import Lesson


def home(request):
    return render(request, 'website/home.html')


def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('website:login')
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


@login_required
def converse(request, room_code):
    user = request.user
    post = get_object_or_404(Lesson, invite_code=room_code)

    if user not in post.clicked_users.all():
        post.add_click(user)

    context = {
        'post': post,
    }

    return render(request, 'website/room2.html', context)


def custom_logout(request):
    logout(request)
    return redirect('website:login')
