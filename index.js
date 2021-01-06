// Packages
const http = require('http')
const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const moment = require('moment')
const _ = require('lodash')
const { createMessageAdapter } = require('@slack/interactive-messages')
const { WebClient } = require('@slack/web-api')

// Read the signing secret from env
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN
const aqiToken = process.env.AQI_TOKEN

// Create the adapter using the app's signing secret
const slackInteractions = createMessageAdapter(slackSigningSecret)

// Create a Slack Web API client using the access token
const web = new WebClient(slackAccessToken)

// Initialize an Express application
const app = express()
const port = process.env.PORT

if (!slackSigningSecret || !slackAccessToken) {
    throw new Error('A Slack signing secret and access token are required to run this app.')
}

app.use('/slack/actions', slackInteractions.expressMiddleware())
app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand)
app.get('/',(req,res) => {
    return res.send({message: 'Hi, this is air quality slack app.'})
})

http.createServer(app).listen(port, () => {
    console.log(`Server listening on port ${port}`)
})

// Functions
function between(x, min, max) {
    return x >= min && x <= max;
}

// Commands
async function slackSlashCommand(req, res, next) {

    console.log(req.body)

    if (req.body.command === '/aqi') {

        // Use near AQI sensor to correct data
        let response = await axios.get(`https://api.waqi.info/feed/geo:18.820616;98.963435/?token=${aqiToken}`)

        let text,image_url
        if(between(response.data.data.aqi,0,50)){
            text = '*Level : Good* :+1: \n Air quality is considered satisfactory, and air pollution poses little or no risk'
            image_url = `https://dummyimage.com/150x150/009966/ffffff.png&text=${response.data.data.aqi}`
        } else if (between(response.data.data.aqi,51,100)) {
            text = '*Level : Moderate* :sweat_smile: \n Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution'
            image_url = `https://dummyimage.com/150x150/ffde33/ffffff.png&text=${response.data.data.aqi}`
        } else if (between(response.data.data.aqi,101,150)) {
            text = '*Level : Unhealthy for Sensitive Groups* :expressionless: \n Members of sensitive groups may experience health effects. The general public is not likely to be affected.'
            image_url = `https://dummyimage.com/150x150/ff9933/ffffff.png&text=${response.data.data.aqi}`
        } else if (between(response.data.data.aqi,151,200)) {
            text = '*Level : Unhealthy* :thinking_face: \n Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects'
            image_url = `https://dummyimage.com/150x150/cc0033/ffffff.png&text=${response.data.data.aqi}`
        } else if (between(response.data.data.aqi,201,300)) {
            text = '*Level : Very Unhealthy* :fearful: \n Health warnings of emergency conditions. The entire population is more likely to be affected.'
            image_url = `https://dummyimage.com/150x150/660099/ffffff.png&text=${response.data.data.aqi}`
        } else {
            text = '*Level : Hazardous* :scream: \n Health alert: everyone may experience more serious health effects'
            image_url = `https://dummyimage.com/150x150/7e0023/ffffff.png&text=${response.data.data.aqi}`
        }

        let aqiBlock = {
            "response_type": "in_channel",
            "text": `Chiang Mai AQI : ${response.data.data.aqi} From ${response.data.data.city.name} Updated on ${moment(response.data.data.time.s).format("DD/MM/YYYY, H:mm")}`,
            "attachments": [
               {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `${text} \n <https://aqicn.org/|Reference : aqicn.org>`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `${image_url}`,
                            "alt_text": "AQI"
                        }
                    }
                ]
            }
            ]
        }

        res.send(aqiBlock)

    }  else if (req.body.command === '/covid-th') {

        let response = await axios.get(`https://covid19.th-stat.com/api/open/today`)

        let confirmed = response.data.Confirmed
        let recovered = response.data.Recovered
        let hospitalized = response.data.Hospitalized
        let deaths = response.data.Deaths
        let updateDate = response.data.UpdateDate
        
        let covidBlock = {
            "response_type": "in_channel",
            "text": `Thailand COVID-19 : Ref https://covid19.th-stat.com/api/open/today Updated on ${updateDate}`,
            "attachments": [
               {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Confirmed cases in Thailand : ${confirmed}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/7c3600/ffffff.png&text=${confirmed}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Recovered cases in Thailand : ${recovered}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/009966/ffffff.png&text=${recovered}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Hospitalized cases in Thailand : ${hospitalized}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/ff9933/ffffff.png&text=${hospitalized}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Deaths cases in Thailand : ${deaths}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/cc0033/ffffff.png&text=${deaths}`,
                            "alt_text": "COVID-19"
                        }
                    }
                ]
            }
            ]
        }

        res.send(covidBlock)
        
        
    } else if (req.body.command === '/covid-th-today') {

        let response = await axios.get(`https://covid19.th-stat.com/api/open/today`)

        let newConfirmed = response.data.NewConfirmed
        let newRecovered = response.data.NewRecovered
        let newHospitalized = response.data.NewHospitalized
        let newDeaths = response.data.NewDeaths
        let updateDate = response.data.UpdateDate
        
        let covidBlock = {
            "response_type": "in_channel",
            "text": `Thailand COVID-19 : Ref https://covid19.th-stat.com/api/open/today Updated on ${updateDate}`,
            "attachments": [
               {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `New confirmed cases in Thailand today : ${newConfirmed}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/7c3600/ffffff.png&text=${newConfirmed}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `New recovered cases in Thailand today : ${newRecovered}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/009966/ffffff.png&text=${newRecovered}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `New hospitalized cases in Thailand today : ${newHospitalized}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/ff9933/ffffff.png&text=${newHospitalized}`,
                            "alt_text": "COVID-19"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `New deaths cases in Thailand today : ${newDeaths}`
                        },
                        "accessory": {
                            "type": "image",
                            "image_url": `https://dummyimage.com/150x150/cc0033/ffffff.png&text=${newDeaths}`,
                            "alt_text": "COVID-19"
                        }
                    }
                ]
            }
            ]
        }

        res.send(covidBlock)

    }
    else {

        res.send('Please use / to show command list')

    }
}