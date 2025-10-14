from django.contrib import admin
from .models import Lesson

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'invite_code')
    search_fields = ('title', 'invite_code')
