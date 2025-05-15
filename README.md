# converse-django

## Instalacja

```bash
git clone https://github.com/KRojowsky/converse-django.git
cd converse-django
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py makemigrations
python manage.py runserver
