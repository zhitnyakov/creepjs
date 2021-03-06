(async () => {

const hashMini = str => {
	const json = `${JSON.stringify(str)}`
	let i, len, hash = 0x811c9dc5
	for (i = 0, len = json.length; i < len; i++) {
		hash = Math.imul(31, hash) + json.charCodeAt(i) | 0
	}
	return ('0000000' + (hash >>> 0).toString(16)).substr(-8)
}

const hashify = async (x) => {
	const json = `${JSON.stringify(x)}`
	const jsonBuffer = new TextEncoder().encode(json)
	const hashBuffer = await crypto.subtle.digest('SHA-256', jsonBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('')
	return hashHex
}

// ie11 fix for template.content
function templateContent(template) {
	// template {display: none !important} /* add css if template is in dom */
	if ('content' in document.createElement('template')) {
		return document.importNode(template.content, true)
	} else {
		const frag = document.createDocumentFragment()
		const children = template.childNodes
		for (let i = 0, len = children.length; i < len; i++) {
			frag.appendChild(children[i].cloneNode(true))
		}
		return frag
	}
}

// tagged template literal (JSX alternative)
const patch = (oldEl, newEl, fn = null) => {
	oldEl.parentNode.replaceChild(newEl, oldEl)
	return typeof fn === 'function' ? fn() : true
}
const html = (stringSet, ...expressionSet) => {
	const template = document.createElement('template')
	template.innerHTML = stringSet.map((str, i) => `${str}${expressionSet[i] || ''}`).join('')
	return templateContent(template) // ie11 fix for template.content
}

const pass = () => `<span class="pass">&#10004;</span>`
const fail = () => `<span class="fail">&#10006;</span>`

// system
// https://stackoverflow.com/a/23736334
const getOS = () => {
	const { userAgent } = navigator
	if (!userAgent) {
		return
	}
	const os = (
		// order is important
		/windows phone/ig.test(userAgent) ? 'Windows Phone' :
		/win(dows|16|32|64|95|98|nt)|wow64/ig.test(userAgent) ? 'Windows' :
		/android/ig.test(userAgent) ? 'Android' :
		/cros/ig.test(userAgent) ? 'Chrome OS' :
		/linux/ig.test(userAgent) ? 'Linux' :
		/ipad/ig.test(userAgent) ? 'iPad' :
		/iphone/ig.test(userAgent) ? 'iPhone' :
		/ipod/ig.test(userAgent) ? 'iPod' :
		/ios/ig.test(userAgent) ? 'iOS' :
		/mac/ig.test(userAgent) ? 'Mac' :
		'Other'
	)
	return os
}

const getOSLie = () => {
	const { userAgent, platform, maxTouchPoints } = navigator
	const userAgentOS = (
		// order is important
		/win(dows|16|32|64|95|98|nt)|wow64/ig.test(userAgent) ? 'Windows' :
		/android|linux|cros/ig.test(userAgent) ? 'Linux' :
		/i(os|p(ad|hone|od))/ig.test(userAgent) ? 'iOS' :
		/mac/ig.test(userAgent) ? 'Mac' :
		'Other'
	)
	const platformOS = (
		// order is important
		/win/ig.test(platform) ? 'Windows' :
		/android|arm|linux/i.test(platform) ? 'Linux' : 
		/i(os|p(ad|hone|od))/ig.test(platform) ? 'iOS' :
		/mac/i.test(platform) ? 'Mac' :
		'Other'
	)
	const invalidWindows64bitCPU = (
		(/w(in|ow)64/ig.test(userAgent) && /win16/ig.test(platform)) ||
		(/win(16|32)/ig.test(userAgent) && !/win(16|32)/ig.test(platform))
	)
	return {
		core: userAgentOS,
		platformLie: userAgentOS != platformOS || invalidWindows64bitCPU,
		macTouchLie: (
			!!maxTouchPoints && (
				(/mac/ig.test(userAgent) && !/like mac/ig.test(userAgent)) || /mac/ig.test(platform)
			)
			// note: touch can be disabled on Android, iOS, and emulators
		)
	}
}

const getVoices = () => new Promise(async resolve => {
	try {
		if (!('speechSynthesis' in window)) {
			return resolve()
		}
		let success = false
		const getVoices = async () => {
			const data = await speechSynthesis.getVoices()
			if (!data.length) {
				return
			}
			success = true
			const voices = data.map(({ name, lang }) => ({ name, lang }))
			return resolve(
				voices.find(key => (/microsoft/i).test(key.name)) ? 'Windows' :
				voices.find(key => (/chrome os/i).test(key.name)) ? 'Chrome OS' :
				voices.find(key => (/android/i).test(key.name)) ? 'Android' : undefined
			)
		}
		
		await getVoices()
		speechSynthesis.onvoiceschanged = getVoices
		setTimeout(() => {
			return !success ? resolve() : undefined
		}, 100)
	}
	catch (error) {
		return resolve()
	}
})


// get Machine
const nonPlatformParenthesis = /\((khtml|unlike|vizio|like gec|internal dummy|org\.eclipse|openssl|ipv6|via translate|safari|cardamon).+|xt\d+\)/ig
const parenthesis = /\((.+)\)/
const android = /((android).+)/i
const androidNoise = /^(linux|[a-z]|wv|mobile|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|windows|(rv:|trident|webview|iemobile).+/i
const androidBuild = /build\/.+\s|\sbuild\/.+/i
const androidRelease = /android( |-)\d/i
const windows = /((windows).+)/i
const windowsNoise = /^(windows|ms(-|)office|microsoft|compatible|[a-z]|x64|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|outlook|ms(-|)office|microsoft|trident|\.net|msie|httrack|media center|infopath|aol|opera|iemobile|webbrowser).+/i
const windows64bitCPU = /w(ow|in)64/i
const cros = /cros/i
const crosNoise = /^([a-z]|x11|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|trident).+/i
const crosBuild = /\d+\.\d+\.\d+/i
const linux = /linux|x11|ubuntu|debian/i
const linuxNoise = /^([a-z]|x11|unknown|compatible|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2})$|(rv:|java|oracle|\+http|http|unknown|mozilla|konqueror|valve).+/i
const apple = /(cpu iphone|cpu os|iphone os|mac os|macos|intel os|ppc mac).+/i
const appleNoise = /^([a-z]|macintosh|compatible|mimic|[a-z]{2}(-|_)[a-z]{2}|[a-z]{2}|rv|\d+\.\d+)$|(rv:|silk|valve).+/i
const appleRelease = /(ppc |intel |)(mac|mac |)os (x |x|)\d+/i
const otherOS = /((symbianos|nokia|blackberry|morphos|mac).+)|\/linux|freebsd|symbos|series \d+|win\d+|unix|hp-ux|bsdi|bsd|x86_64/i

const isDevice = (list, device) => list.filter(x => device.test(x)).length

const getUserAgentPlatform = ({ userAgent, excludeBuild = true }) => {
	if (!userAgent) {
		return
	}
	const { platformLie, macTouchLie, core } = getOSLie({userAgent})
	const ua = {
		core,
		platformLie,
		macTouchLie,
		trimmed: userAgent.trim().replace(/\s{2,}/, ' ')
	}
	
	ua.compressed = ua.trimmed.replace(nonPlatformParenthesis, '').trim()

	if (!parenthesis.test(ua.compressed)) {
		return
	}

	ua.platform = ua.compressed.match(parenthesis)[0]
	ua.identifiers = ua.platform.slice(1, -1).replace(/,/g, ';').split(';').map(x => x.trim())

	if (isDevice(ua.identifiers, android)) {
		ua.parsed = ua.identifiers
			.map(x => androidRelease.test(x) ? androidRelease.exec(x)[0].replace('-', ' ') : x)
			.filter(x => !(androidNoise.test(x)))
			.join(' ')
			.replace((excludeBuild ? androidBuild : ''), '')
			.trim().replace(/\s{2,}/, ' ')
		return ua

	} else if (isDevice(ua.identifiers, windows)) {
		ua.parsed =  ua.identifiers
			.filter(x => !(windowsNoise.test(x)))
			.join(' ')
			.replace(/\sNT (\d+\.\d+)/, (match, version) => {
				return (
					version == '10.0' ? ' 10' :
					version == '6.3' ? ' 8.1' :
					version == '6.2' ? ' 8' :
					version == '6.1' ? ' 7' :
					version == '6.0' ? ' Vista' :
					version == '5.2' ? ' XP Pro' :
					version == '5.1' ? ' XP' :
					version == '5.0' ? ' 2000' :
					version == '4.0' ? match :
					' ' + version
				)
			})
			.replace(windows64bitCPU, '(64-bit)')
			.trim().replace(/\s{2,}/, ' ')
		return ua
	} else if (isDevice(ua.identifiers, cros)) {
		ua.parsed = ua.identifiers
			.filter(x => !(crosNoise.test(x)))
			.join(' ')
			.replace((excludeBuild ? crosBuild : ''), '')
			.trim().replace(/\s{2,}/, ' ')
		return ua
	} else if (isDevice(ua.identifiers, linux)) {
		ua.parsed = ua.identifiers
			.filter(x => !(linuxNoise.test(x)))
			.join(' ')
			.trim().replace(/\s{2,}/, ' ')
		return ua
	} else if (isDevice(ua.identifiers, apple)) {
		ua.parsed = ua.identifiers
			.map(x => appleRelease.test(x) ? appleRelease.exec(x)[0] : x)
			.filter(x => !(appleNoise.test(x)))
			.join(' ')
			.replace(/\slike mac.+/ig, '')
			.trim().replace(/\s{2,}/, ' ')
		return ua
	} else {
		const other = ua.identifiers.filter(x => otherOS.test(x))
		if (other.legnth) {
			ua.parsed = other.join(' ').trim().replace(/\s{2,}/, ' ')
			return ua
		}
		ua.parsed = ua.identifiers.join(' ')
		return ua
	}
}


const start = performance.now()

const { userAgent, hardwareConcurrency, deviceMemory, maxTouchPoints } = navigator
const res = getUserAgentPlatform({ userAgent, excludeBuild: true }) || {}
const voiceSystem = await getVoices()
const system = getOS()
const voiceSystemLie = voiceSystem && (voiceSystem != system)
const testMobile = (n, system, limit = 8) => n > limit && system && /Windows Phone|Android|iPad|iPhone|iPod|iOS/.test(system)
const memoryLie = testMobile(deviceMemory, system)
const coresLie = testMobile(hardwareConcurrency, system)
const perf = performance.now() - start 
patch(document.getElementById('fingerprint-data'), html`
	<div id="fingerprint-data">
		<style>
		#fingerprint-data > .visitor-info > .jumbo {
			font-size: 32px !important;
		}
		.pass, .fail {
			margin: 0 4px 0 0;
			padding: 1px 5px;
			border-radius: 3px;
		}
		.pass {
			color: #2da568;
			background: #2da5681a;
		}
		.fail {
			background: #ca656e0d;
		}
		.fail, .bold-fail, .erratic {
			color: #ca656e;
		}
		.bold-fail {
			background: #ca656e0d;
			font-weight: bold;
			border-bottom: 1px solid;
		}
		.group {
			font-size: 12px !important;
			border-radius: 3px;
			padding: 10px 15px;
			min-height: 60px;
		}
		.identifier {
			background: #657fca26;
			color: #8f8ff1 !important;
		}
		.isolate {
			background: #657fca1a
		}
		@media (prefers-color-scheme: dark) {
			
		}
		
		</style>
		<div class="visitor-info">
			<span class="aside-note">${perf.toFixed(2)}ms</span>
			<strong>Machine</strong>
		</div>
		<div class="ua-container">
			<div class="group">${res.trimmed || ''}</div>
			<div>${!res.identifiers || !res.identifiers.length ? fail() : pass()}identifiers: ${res.identifiers && res.identifiers.length ? res.identifiers.join(', ') : 'undefined'}</div>
			<div>${!res.core ? fail() : pass()}core: ${!res.core ? 'unknown' : res.core}</div>
			<div>${!system ? fail() : pass()}system: ${!system ? 'unknown' : system}</div>
			<div>${!res.parsed ? fail() : pass()}device: ${!res.parsed ? 'unknown' : res.parsed}</div>
			<div>${res.platformLie ? fail() : pass()}platform: ${navigator.platform}</div>
			<div>${res.macTouchLie ? fail() : pass()}maxTouchPoints: ${''+maxTouchPoints}</div>
			<div>${memoryLie ? fail() : pass()}deviceMemory: ${''+deviceMemory}</div>
			<div>${coresLie ? fail() : pass()}hardwareConcurrency: ${''+hardwareConcurrency}</div>
			<div>${voiceSystemLie ? fail() : pass()}speechSynthesis: ${voiceSystem || 'unknown'}</div>
		</div>
		<div>
			${
				JSON.stringify(res) != '{}' && (
					!res.macTouchLie &&
					!res.platformLie &&
					!voiceSystemLie &&
					!memoryLie &&
					!coresLie
				) ? 
				`<span class="pass">&#10004; passed</span>` : ''
			}
			${res.platformLie ? `<div class="erratic">${res.core} core does not support ${navigator.platform}</div>` : ''}
			${res.macTouchLie ? `<div class="erratic">Macs do not support touch</div>` : ''}
			${memoryLie ? `<div class="erratic">deviceMemory too high for ${system}</div>` : ''}
			${coresLie? `<div class="erratic">hardwareConcurrency too high for ${system}</div>` : ''}
			${voiceSystemLie ? `<div class="erratic">${voiceSystem} speechSynthesis does not match ${system} system</div>` : ''}
		</div>
	</div>
`)
})()