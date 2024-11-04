require('dotenv').config()
const axios = require('axios')
const crypto = require('crypto')
const logger = require('./logger')

// Функция для генерации уникального токена
function generateToken() {
	return crypto.randomBytes(16).toString('hex')
}

// Функция для создания платежа в Cryptomus
async function createPayment(amount, currency, order_id) {
	const apiUrl = 'https://cryptomus.com/api/payment'
	const apiKey = process.env.CRYPTOMUS_API_KEY

	try {
		const response = await axios.post(
			apiUrl,
			{
				amount: amount,
				currency: currency,
				order_id: order_id,
			},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			}
		)
		return response.data
	} catch (error) {
		logger.error(`Ошибка при создании платежа: ${error.message}`)
		throw new Error('Не удалось создать платеж.')
	}
}

// Функция для проверки статуса платежа в Cryptomus
async function checkPayment(txHash) {
	logger.info('Запуск проверки платежа...')
	logger.info(`Хеш транзакции: ${txHash}`)

	const apiUrl = `https://cryptomus.com/api/payment/${txHash}`
	const apiKey = process.env.CRYPTOMUS_API_KEY

	try {
		const response = await axios.get(apiUrl, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		})

		const data = response.data
		logger.info(`Ответ Cryptomus API: ${JSON.stringify(data)}`)

		if (data.success && data.data.status === 'paid') {
			logger.info('Платеж успешно подтвержден.')
			return { success: true }
		} else {
			logger.warn('Платеж не подтвержден или не найден.')
			return { success: false, error: 'Платеж не найден или не подтвержден.' }
		}
	} catch (error) {
		logger.error(`Ошибка при проверке платежа: ${error.message}`)
		return { success: false, error: 'Ошибка при проверке платежа.' }
	}
}

module.exports = { generateToken, createPayment, checkPayment }
