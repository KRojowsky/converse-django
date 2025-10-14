from django.urls import path
from . import views
from django.contrib.auth import views as auth_views


urlpatterns = [
    path('', views.home, name='home'),
    path('converse', views.converse, name='converse'),
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', views.custom_logout, name='logout'),
    path('register/', views.register, name='register'),
    
    path('api/agora-token/', views.get_agora_token, name='agora_token'),

]

