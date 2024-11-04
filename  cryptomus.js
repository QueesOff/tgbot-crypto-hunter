const Cryptomus = require('cryptomus')

const cryptomus = new Cryptomus({
	publicKey: process.env.CRYPTOMUS_PUBLIC_KEY,
	secretKey: process.env.CRYPTOMUS_SECRET_KEY,
})

// Функция для создания платежа
async function createPayment(amount, currency, callbackUrl) {
	try {
		const payment = await cryptomus.createPayment({
			amount: amount,
			currency: currency,
			callbackUrl: callbackUrl,
		})
		return payment
	} catch (error) {
		console.error('Ошибка при создании платежа:', error)
		throw error
	}
}

// Функция для проверки статуса платежа
async function checkPayment(paymentId) {
	try {
		const paymentStatus = await cryptomus.getPaymentStatus(paymentId)
		return paymentStatus
	} catch (error) {
		console.error('Ошибка при проверке статуса платежа:', error)
		throw error
	}
}

module.exports = { createPayment, checkPayment }
