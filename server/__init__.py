from flask import Flask
from datetime import datetime, timezone
import pytz, json

from server.helper import settings, format_number, count_things
# from server.helper import settings, cache_config, cache, scheduler
from server.models import Genome
# from server.tasks import 

def create_app():

    # Set up Flask app
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.FLASK_SECRET_KEY

    # Add funtions from helper.py to the Jinja environment
    # I want to do this in a more elegant way, but this works for now
    app.jinja_env.globals.update(format_number=format_number)
    app.jinja_env.globals.update(serialize_json=json.dumps)
    app.jinja_env.globals.update(count_things=count_things)
    
    # Set up cache (object defined in helper.py)
    # cache.init_app(app, config=cache_config)

    # Set up scheduler (object defined in helper.py)
    # scheduler.init_app(app)
    # scheduler.start()
    
    # Don't run the value updater when testing locally -- the timezones mess up the history
    # It's actually solved now, but I'm leaving this here just in case :)
    # if settings.ENVIRONMENT == "local":
    #     print("Not starting scheduler in local environment ⏰")
    # else:
    #     # This should run at UPDATE_HOUR:01 UTC every day and we should clear the cache the minute before
    #     scheduler.add_job(id="clear_cache", func=cache.clear, trigger="cron", hour=settings.UPDATE_HOUR_UTC, minute=0, timezone=pytz.timezone("UTC"))
    #     scheduler.add_job(id="update_all_portfolio_vals", func=update_all_portfolio_vals, trigger="cron", hour=settings.UPDATE_HOUR_UTC, minute=1, timezone=pytz.timezone("UTC"))
    #     print("Scheduler started! ⏰")
    #     update_all_portfolio_vals() # To make sure it works! And the server was down during the update time!

    # Blueprint for main routes from routes/main.py
    from .routes.main import main as main_blueprint
    app.register_blueprint(main_blueprint)

    # Blueprint for API routes from routes/api.py
    from .routes.api import api as api_blueprint
    app.register_blueprint(api_blueprint)

    # Make sure the app is running with the correct settings
    print("Routes registered! 🌐")
    print(f"The current environment is {settings.ENVIRONMENT} 🌎")

    return(app)
