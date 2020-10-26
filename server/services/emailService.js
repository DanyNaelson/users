const apiAdapter = require('./apiAdapter')

const api = apiAdapter(process.env.EMAIL_SERVICE_URL)

const sendEmail = async(body, token) => {
    const headers = {
        'Authorization': token
    }

    return await api.post(process.env.EMAIL_SERVICE_URL + '/send-verification-code', body, { headers: headers })
        .then(resp => {
            return {
                ok: true,
                info: resp.data.info
            }
        })
        .catch(err => {console.log(err)
            if(err.code === 'ETIMEDOUT') {
                return {
                    ok: false,
                    error: 'email_service_timeout'
                }
            }

            return {
                ok: err.response.data.ok,
                error: err.response.data.err
            }
        })
}

module.exports = {
    sendEmail
}