from django.db import models
from django.contrib.auth.models import User


class Lesson(models.Model):
    title = models.CharField(max_length=100)
    invite_code = models.CharField(max_length=20, unique=True)

    def add_click(self, user):
        self.clicked_users.add(user)

    def __str__(self):
        return self.title
