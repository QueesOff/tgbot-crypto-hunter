const fs = require('fs')
const path = require('path')

// Путь к директории хранения токенов
const tokensDir = path.join(__dirname, 'tokens')

// Создаем директорию, если она не существует
if (!fs.existsSync(tokensDir)) {
	fs.mkdirSync(tokensDir)
}

// Функция для сохранения токена с временной меткой истечения срока
function saveToken(token, expiration) {
	const tokenData = { expiration }
	const tokenPath = path.join(tokensDir, `${token}.json`)

	fs.writeFileSync(tokenPath, JSON.stringify(tokenData))
}

// Функция для загрузки токена и проверки его срока действия
function loadToken(token) {
	const tokenPath = path.join(tokensDir, `${token}.json`)

	if (!fs.existsSync(tokenPath)) return null

	const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'))

	// Проверяем, не истек ли срок действия токена
	if (Date.now() > tokenData.expiration) {
		fs.unlinkSync(tokenPath) // Удаляем токен, если срок истек
		return null
	}

	return tokenData
}

// Функция для удаления токена после активации
function deleteToken(token) {
	const tokenPath = path.join(tokensDir, `${token}.json`)

	if (fs.existsSync(tokenPath)) {
		fs.unlinkSync(tokenPath)
	}
}

module.exports = { saveToken, loadToken, deleteToken }
