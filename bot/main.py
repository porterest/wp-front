import logging

from telegram import Update, InlineKeyboardButton, WebAppInfo, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, ApplicationBuilder

from settings import settings

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logging.getLogger("telegram").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    webapp = WebAppInfo(
        url=settings.webapp_url,
    )
    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("тык сюда", web_app=webapp),
            ]
        ]
    )
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=settings.welcome_message,
        reply_markup=keyboard,
    )


# ADMIN_CHAT_ID = 848643556


if __name__ == "__main__":
    app = ApplicationBuilder().token(settings.token.get_secret_value()).build()

    app.add_handler(
        CommandHandler(
            command="start",
            callback=start,
        )
    )

    app.run_polling()
