from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

app_name = 'website'

urlpatterns = [
    path('', views.home, name='home'),
    path('room/<str:room_code>/', views.converse, name='converse'),

    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', views.custom_logout, name='logout'),
    path('register/', views.register, name='register'),
]
