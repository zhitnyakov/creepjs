import { captureError, attempt, caniuse } from './captureErrors.js'
const source = 'creepworker.js'

const getDedicatedWorker = phantomDarkness => {
	return new Promise(resolve => {
		try {
			if (phantomDarkness && !phantomDarkness.Worker) {
				return resolve()
			}
			else if (
				phantomDarkness && phantomDarkness.Worker.prototype.constructor.name != 'Worker'
			) {
				throw new Error('Worker tampered with by client')
			}
			const worker = (
				phantomDarkness ? phantomDarkness.Worker : Worker
			)
			const dedicatedWorker = new worker(source)
			dedicatedWorker.onmessage = message => {
				dedicatedWorker.terminate()
				return resolve(message.data)
			}
		}
		catch(error) {
			console.error(error)
			captureError(error)
			return resolve()
		}
	})
}

const getSharedWorker = phantomDarkness => {
	return new Promise(resolve => {
		try {
			if (phantomDarkness && !phantomDarkness.SharedWorker) {
				return resolve()
			}
			else if (
				phantomDarkness && phantomDarkness.SharedWorker.prototype.constructor.name != 'SharedWorker'
			) {
				throw new Error('SharedWorker tampered with by client')
			}

			const worker = (
				phantomDarkness ? phantomDarkness.SharedWorker : SharedWorker
			)
			const sharedWorker = new worker(source)
			sharedWorker.port.start()
			sharedWorker.port.addEventListener('message', message => {
				sharedWorker.port.close()
				return resolve(message.data)
			})
		}
		catch(error) {
			console.error(error)
			captureError(error)
			return resolve()
		}
	})
}

const getServiceWorker = () => {
	return new Promise(async resolve => {
		try {
			if (!('serviceWorker' in navigator)) {
				return resolve()
			}
			else if (navigator.serviceWorker.__proto__.constructor.name != 'ServiceWorkerContainer') {
				throw new Error('ServiceWorkerContainer tampered with by client')
			}

			await navigator.serviceWorker.register(source)
			.catch(error => {
				console.error(error)
				return resolve()
			})
			const registration = await navigator.serviceWorker.ready
			.catch(error => {
				console.error(error)
				return resolve()
			})
			const broadcast = new BroadcastChannel('creep_service_primary')
			broadcast.onmessage = message => {
				registration.unregister()
				broadcast.close()
				return resolve(message.data)
			}
			broadcast.postMessage({ type: 'fingerprint'})
			return setTimeout(() => resolve(), 1000)
		}
		catch(error) {
			console.error(error)
			captureError(error)
			return resolve()
		}
	})
}

export const getBestWorkerScope = async imports => {	
	const {
		require: {
			getOS,
			captureError,
			caniuse,
			phantomDarkness,
			getUserAgentPlatform,
			logTestResult
		}
	} = imports
	try {
		await new Promise(setTimeout)
		const start = performance.now()
		let type = 'service' // loads fast but is not available in frames
		let workerScope = await getServiceWorker()
			.catch(error => console.error(error.message))
		if (!caniuse(() => workerScope.userAgent)) {
			type = 'shared' // no support in Safari, iOS, and Chrome Android
			workerScope = await getSharedWorker(phantomDarkness)
			.catch(error => console.error(error.message))
		}
		if (!caniuse(() => workerScope.userAgent)) {
			type = 'dedicated' // simulators & extensions can spoof userAgent
			workerScope = await getDedicatedWorker(phantomDarkness)
			.catch(error => console.error(error.message))
		}
		if (caniuse(() => workerScope.userAgent)) {
			const { canvas2d } = workerScope || {}
			workerScope.system = getOS(workerScope.userAgent)
			workerScope.device = getUserAgentPlatform({ userAgent: workerScope.userAgent })
			workerScope.canvas2d = { dataURI: canvas2d }
			workerScope.type = type
			logTestResult({ start, test: `${type} worker`, passed: true })
			return { ...workerScope }
		}
		return
	}
	catch (error) {
		logTestResult({ test: 'worker', passed: false })
		captureError(error, 'workers failed or blocked by client')
		return
	}
}