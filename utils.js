// utils.js
require('dotenv').config()
const axios = require('axios')
const crypto = require('crypto')
const logger = require('./logger') // Используем winston для логирования

// Функция для генерации уникального токена
function generateToken() {
	return crypto.randomBytes(16).toString('hex')
}

// Функция для проверки платежа через Tronscan API
async function checkPayment(txHash) {
	logger.info('Запуск проверки платежа...')
	logger.info(`Хеш транзакции: ${txHash}`)

	const minAmount = 50 // Минимальная сумма в USDT
	const maxTimeDiff = 3 * 30 * 24 * 60 * 60 * 1000 // 3 месяца в миллисекундах
	const usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // Официальный адрес контракта USDT TRC20
	const recipientAddress = process.env.TRON_ADDRESS // Ваш Tron-адрес из .env

	const tronscanApiUrl = `https://api.tronscan.org/api/transaction-info?hash=${txHash}`
	const apiKey = process.env.TRONSCAN_API_KEY

	try {
		const response = await axios.get(tronscanApiUrl, {
			headers: {
				apikey: apiKey, // Используем ваш API-ключ
			},
		})

		const data = response.data
		logger.info(`Ответ Tronscan API: ${JSON.stringify(data)}`)

		// Проверка наличия данных в `trc20TransferInfo`
		const trc20Info = data.trc20TransferInfo && data.trc20TransferInfo[0]
		if (!trc20Info || trc20Info.contract_address !== usdtContractAddress) {
			logger.warn('Транзакция не связана с USDT TRC20.')
			return { success: false, error: 'Транзакция не связана с USDT TRC20.' }
		}

		// Проверка получателя
		if (trc20Info.to_address !== recipientAddress) {
			logger.warn('Адрес получателя не совпадает.')
			return { success: false, error: 'Адрес получателя не совпадает.' }
		}

		// Проверка суммы
		const amount = parseFloat(trc20Info.amount_str) / 1e6 // USDT имеет 6 десятичных знаков
		logger.info(`Сумма транзакции: ${amount} USDT`)
		if (amount < minAmount) {
			logger.warn(
				`Сумма транзакции (${amount} USDT) меньше минимально требуемой (${minAmount} USDT).`
			)
			return {
				success: false,
				error: 'Сумма транзакции меньше минимально требуемой.',
			}
		}

		// Проверка времени транзакции
		const transactionTime = new Date(data.timestamp)
		const currentTime = new Date()
		logger.info(`Время транзакции: ${transactionTime}`)
		logger.info(`Текущее время: ${currentTime}`)
		if (currentTime - transactionTime > maxTimeDiff) {
			logger.warn('Транзакция была совершена более 3 месяцев назад.')
			return {
				success: false,
				error: 'Транзакция была совершена более 3 месяцев назад.',
			}
		}

		logger.info('Транзакция успешно проверена.')
		return { success: true }
	} catch (error) {
		logger.error(`Ошибка при проверке платежа: ${error.message}`)
		return { success: false, error: 'Ошибка при проверке платежа.' }
	}
}

module.exports = { generateToken, checkPayment }
