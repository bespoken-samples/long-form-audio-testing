const _ = require('lodash')
const vdk = require('virtual-device-sdk')

class Device {
  constructor (token) {
    this._token = token
  }

  async message (message, attempt = 1) {
    const virtualDevice = new vdk.VirtualDevice({
      debug: true,
      token: this._token,
      voiceID: 'en-US-Wavenet-D'
    })

    virtualDevice.baseURL = process.env.VIRTUAL_DEVICE_BASE_URL ? process.env.VIRTUAL_DEVICE_BASE_URL : 'https://virtual-device.bespoken.io'

    try {
      const response = await virtualDevice.message(message)
      return response
    } catch (e) {
      let error = e
      try {
        // Try to parse out the error message, if this is JSON
        error = JSON.parse(e).error
      } catch (ee) {}

      if (attempt > 3) {
        // Give up after three tries
        return error
      }

      const backoffTime = 10000
      console.error(`ERROR: ${error} RETRYING IN ${backoffTime / 1000} seconds`)
      await pause(backoffTime)
      return this.message(message, attempt + 1)
    }
  }

  get token () {
    return this._token
  }
}

class DevicePool {
  constructor () {
    const tokens = process.env.VIRTUAL_DEVICE_TOKEN.split(',') // The virtual device token(s) used for processing
    this._devices = []
    // Create a device for each token
    tokens.forEach(token => this._devices.push(new Device(token)))

    // Create an array to track the devices currently in use
    this._devicesInUse = []
  }

  async lock () {
    // Check if a free token is available
    console.log('LOCK ATTEMPT - DEVICES AVAILABLE: ' + this._freeCount())
    while (this._freeCount() === 0) {
      await pause(5000)
    }

    // If there is a free token, add to our list of tokens in use so no one else can use it
    const device = this._devices.find((device) => {
      return this._devicesInUse.find(d => d.token === device.token) === undefined
    })
    console.log('LOCK ACQUIRE - DEVICES AVAILABLE: ' + this._freeCount() + ' TOKEN: ' + device.token)

    this._devicesInUse.push(device)
    return device
  }

  async free (device) {
    // Remove the token we used from our tokens in list use - i.e., return it to the free pool
    this._devicesInUse = _.pull(this._devicesInUse, device)
    console.log('LOCK FREE ' + device._token + ' TOKENS AVAILABLE: ' + this._freeCount())
  }

  _freeCount () {
    return this._devices.length - this._devicesInUse.length
  }
}

async function pause (sleepTime) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, sleepTime)
  })
}

module.exports = {
  Device,
  DevicePool
}
