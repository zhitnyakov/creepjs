const createErrorsCaptured = () => {
	const errors = []
  	return {
		getErrors: () => errors,
		captureError: (error, customMessage = null) => {
			const type = {
				Error: true,
				EvalError: true, 
				InternalError: true,
				RangeError: true,
				ReferenceError: true,
				SyntaxError: true,
				TypeError: true,
				URIError: true,
				InvalidStateError: true,
				SecurityError: true
			}
			const hasInnerSpace = s => /.+(\s).+/g.test(s) // ignore AOPR noise
			console.error(error) // log error to educate
			const { name, message } = error
			const trustedMessage = (
				!hasInnerSpace(message) ? undefined :
				!customMessage ? message :
				`${message} [${customMessage}]`
			)
			const trustedName = type[name] ? name : undefined
			errors.push(
				{ trustedName, trustedMessage }
			)
			return undefined
		}
	}
}
const errorsCaptured = createErrorsCaptured()
const { captureError } = errorsCaptured

const attempt = (fn, customMessage = null) => {
	try {
		return fn()
	} catch (error) {
		if (customMessage) {
			return captureError(error, customMessage)
		}
		return captureError(error)
	}
}

const caniuse = (fn, objChainList = [], args = [], method = false) => {
	let api
	try {
		api = fn()
	} catch (error) {
		return undefined
	}
	let i, len = objChainList.length, chain = api
	try {
		for (i = 0; i < len; i++) {
			const obj = objChainList[i]
			chain = chain[obj]
		}
	}
	catch (error) {
		return undefined
	}
	return (
		method && args.length ? chain.apply(api, args) :
		method && !args.length ? chain.apply(api) :
		chain
	)
}

// Log performance time
const timer = (logStart) => {
	logStart && console.log(logStart)
	let start = 0
	try {
		start = performance.now()
	}
	catch (error) {
		captureError(error)
	}
	return logEnd => {
		let end = 0
		try {
			end = performance.now() - start
			logEnd && console.log(`${logEnd}: ${end / 1000} seconds`)
			return end
		}
		catch (error) {
			captureError(error)
			return 0
		}
	}
}


const getCapturedErrors = imports => {

	const {
		require: {
			hashify,
			patch,
			html,
			note,
			modal,
			errorsCaptured
		}
	} = imports

	const errors = errorsCaptured.getErrors()

	return new Promise(async resolve => {
		const len = errors.length
		const data =  errors
		const $hash = await hashify(data)
		resolve({data, $hash })
		const id = 'creep-captured-errors'
		const el = document.getElementById(id)
		return patch(el, html`
		<div class="${len ? 'errors': ''}">
			<strong>Errors Captured</strong>
			<div class="ellipsis">hash: ${$hash}</div>
			<div>errors (${!len ? '0' : ''+len }): ${
				len ? modal(id, Object.keys(data).map((key, i) => `${i+1}: ${data[key].trustedName} - ${data[key].trustedMessage} `).join('<br>')) : `<span class="none">none</span>`
			}</div>
		</div>
		`)
	})
}

export { captureError, attempt, caniuse, timer, errorsCaptured, getCapturedErrors }