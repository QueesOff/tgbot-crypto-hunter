require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const i18n = require('./i18n')
const { checkPayment, generateToken } = require('./utils')
const { saveToken } = require('./file_manager')
const logger = require('./logger') // Используем winston для логирования

const TOKEN = process.env.TELEGRAM_TOKEN
const bot = new TelegramBot(TOKEN, { polling: true })

// Обработка ошибок polling
bot.on('polling_error', error => {
	logger.error(`Polling error: ${error.code} - ${error.message}`)
})

// Храним данные пользователей в памяти (для простоты)
const userSessions = {}

// Обработка команды /start
bot.onText(/\/start/, msg => {
	const chatId = msg.chat.id
	bot.sendMessage(chatId, `👋 ${i18n.__('start')} 🌐`, {
		reply_markup: {
			inline_keyboard: [
				[{ text: '🇺🇸 English', callback_data: 'lang_en' }],
				[{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
				[{ text: '🇪🇸 Español', callback_data: 'lang_es' }],
				[{ text: '🇨🇳 中文', callback_data: 'lang_zh' }],
			],
		},
	})
})

// Обработка выбора языка
bot.on('callback_query', query => {
	const chatId = query.message.chat.id
	const data = query.data

	if (data.startsWith('lang_')) {
		const lang = data.split('_')[1]
		i18n.setLocale(lang) // Устанавливаем выбранный язык
		bot.sendMessage(
			chatId,
			`📋 ${i18n.__('description')}\n\n💼 ${i18n.__('about')}`,
			{
				reply_markup: {
					keyboard: [[`🛒 ${i18n.__('buy')}`], [`ℹ️ ${i18n.__('about')}`]],
					resize_keyboard: true,
					one_time_keyboard: true,
				},
			}
		)
	}
})

// Обработка сообщений пользователя
bot.on('message', async msg => {
	const chatId = msg.chat.id
	const text = msg.text

	// Игнорируем команды (начинаются с '/')
	if (text.startsWith('/')) {
		return
	}

	// Проверка кнопки "🛒 Купить программу"
	if (text === `🛒 ${i18n.__('buy')}`) {
		// Сохраняем состояние пользователя
		userSessions[chatId] = { awaitingPayment: true }

		bot.sendMessage(
			chatId,
			`💳 ${i18n.__(
				'payment_info'
			)}\n\n🚀 *Отправьте 50 USDT или больше (сеть TRC20) на следующий адрес:*\n\n📬 *Адрес*: \`${
				process.env.TRON_ADDRESS
			}\`\n\n🔄 ${i18n.__('transaction_request')}`,
			{ parse_mode: 'Markdown' }
		)
	}
	// Проверка кнопки "ℹ️ О нас"
	else if (text === `ℹ️ ${i18n.__('about')}`) {
		bot.sendPhoto(chatId, './public/bg.png', {
			caption: `ℹ️ ${i18n.__(
				'description'
			)}\n\n📥 Скачайте и активируйте вашу программу после оплаты!`,
		})
	}
	// Проверка хеша транзакции
	else if (text.match(/^[0-9a-fA-F]{64}$/)) {
		// Проверяем, ожидает ли пользователь ввода хеша
		if (userSessions[chatId] && userSessions[chatId].awaitingPayment) {
			bot.sendMessage(
				chatId,
				'⏳ Проверяем вашу транзакцию, пожалуйста, подождите...'
			)
			const result = await checkPayment(text)

			if (result.success) {
				const token = generateToken()
				const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000 // 3 месяца в миллисекундах
				const expiration = Date.now() + threeMonthsInMs
				saveToken(token, expiration)

				bot.sendMessage(
					chatId,
					`🎉 ${i18n.__(
						'thank_you'
					)}\n\n🔑 *Токен*: ${token}\n📆 *Действителен в течение*: 3 месяцев`,
					{ parse_mode: 'Markdown' }
				)
				bot.sendDocument(chatId, './public/soft.zip', {
					caption:
						'📂 Вот ваш файл программы. Следуйте инструкциям для его активации!',
				})

				// Сбрасываем состояние пользователя
				delete userSessions[chatId]
			} else {
				bot.sendMessage(
					chatId,
					`⚠️ Проверка платежа не удалась: ${result.error}\n\nПожалуйста, проверьте вашу транзакцию и попробуйте снова.`
				)
			}
		} else {
			bot.sendMessage(
				chatId,
				'⚠️ Пожалуйста, нажмите "Купить программу" перед отправкой хеша транзакции.'
			)
		}
	} else {
		bot.sendMessage(chatId, '⚠️ Неверная команда или формат сообщения.')
	}
})
