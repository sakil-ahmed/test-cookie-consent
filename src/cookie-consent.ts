/**
 * VERSION: 1.2.7
 **/

interface CookiePreferences {
    strictlyNecessary: boolean
    analytics: boolean
    personalization: boolean
    marketing: boolean

    [key: string]: boolean
}

// let cookiePopup: HTMLElement | null = null
let cookiePopupHidePeriod: string = 'FOREVER'
let cookiePreferences: CookiePreferences = {
    strictlyNecessary: true,
    analytics: false,
    personalization: false,
    marketing: false,
}

let styleSheetToHidePopup: CSSStyleSheet | null = null

hidePopupByDefault()
console.log('FlowAppz Cookie Consent')

function getCookieByName(cookieName: string): string | null {
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
        cookie = cookie.trim()
        if (cookie.startsWith(`${cookieName}=`)) {
            return cookie.substring(cookieName.length + 1)
        }
    }
    return null
}

function updateUiBasedOnCookiePreferences(): void {
    const userPreferences = getCookieByName('cookiePreferences')

    if (userPreferences) {
        cookiePreferences = JSON.parse(userPreferences)
        const togglers = document.querySelectorAll<HTMLInputElement>(`[flowappz-cookie-choice]`)

        togglers.forEach((toggler) => {
            const key = toggler.getAttribute('flowappz-cookie-choice')
            if (key && key in cookiePreferences) {
                toggler.checked = cookiePreferences[key]

                const labelElement = toggler.closest('label')
                if (labelElement) {
                    const customCheckboxDiv = labelElement.querySelector('.w-checkbox-input--inputType-custom')
                    if (customCheckboxDiv) {
                        if (cookiePreferences[key]) {
                            customCheckboxDiv.classList.add('w--redirected-checked')
                        } else {
                            if (key !== 'necessary') {
                                customCheckboxDiv.classList.remove('w--redirected-checked')
                            }
                        }
                    }
                }
            }
        })
    }
}

window.addEventListener('DOMContentLoaded', async function initializeCookieConsentApp() {
    const siteId = document.querySelector('html')?.getAttribute('data-wf-site')
    enableFreeFunctionality()
    if (siteId && (await hasValidLicenseKey(siteId))) {
        makeTheCookieConsentInteractive(siteId)
    } else {
        const manageSettingsBtn = document.querySelectorAll<HTMLElement>(`[flowappz-cookie-command="manage-settings"]`)

        if (manageSettingsBtn) {
            manageSettingsBtn.forEach((b) => {
                b.style.display = 'none'
            })
        }

        console.log('%cPurchase a subscription to access the premium features of Cookie Consent.', 'color: red; font-size: 30px; font-weight: bold;')
    }

    const checkbox = document.querySelector<HTMLInputElement>('[flowappz-cookie-choice="necessary"]')
    if (checkbox) {
        checkbox.setAttribute('disabled', 'true')
    }
    updateUiBasedOnCookiePreferences()
})

async function hasValidLicenseKey(siteId: string): Promise<boolean> {
    const res = await fetch(`${import.meta.env.VITE_LICENSE_VALIDATION_API}/api/license?siteId=${siteId}&appName=cookie-consent`)
    if (res.ok) {
        const data = await res.json()

        return data.active
    }
    return false
}

async function makeTheCookieConsentInteractive(siteId: string): Promise<void> {
    try {
        makeTheUIInteractive()
        connectToGoogleAnalytics(siteId)
    } catch (err) {
        console.log('Error: ', err)
    }
}

function enableFreeFunctionality(): void {
    if (!shouldShowCookiePopup()) return

    if (styleSheetToHidePopup) {
        styleSheetToHidePopup.disabled = true
    }

    const agreeButton = document.querySelector<HTMLElement>(`[flowappz-cookie-command="accept-all"]`)
    if (agreeButton) {
        agreeButton.addEventListener('click', () => {
            let cookiePreferences: CookiePreferences = {
                strictlyNecessary: true,
                personalization: true,
                statistical: true,
                analytics: true,
                marketing: true,
            }
            if (styleSheetToHidePopup) {
                styleSheetToHidePopup.disabled = false
            }
            storeCookiePreferences(cookiePreferences)
        })
    }

    const rejectButton = document.querySelector<HTMLElement>(`[flowappz-cookie-command="reject-all"]`)
    if (rejectButton) {
        rejectButton.addEventListener('click', () => {
            if (styleSheetToHidePopup) {
                styleSheetToHidePopup.disabled = false
            }
            storeCookiePreferences()
        })
    }
}

function makeTheUIInteractive(): void {
    if (!shouldShowCookiePopup() && styleSheetToHidePopup) {
        styleSheetToHidePopup.disabled = false
    }

    preventDefaultFormSubmit()

    const acceptAllButtons = document.querySelectorAll<HTMLElement>(`[flowappz-cookie-command="accept-all"]`)
    acceptAllButtons.forEach((button) => {
        button.addEventListener('click', handleAcceptAll)
    })

    const rejectAllButtons = document.querySelectorAll<HTMLElement>(`[flowappz-cookie-command="reject-all"]`)
    rejectAllButtons.forEach((button) => {
        button.addEventListener('click', handleRejectAll)
    })

    const acceptSelectedButton = document.querySelector<HTMLElement>(`[flowappz-cookie-command="accept-selected"]`)
    if (acceptSelectedButton) {
        acceptSelectedButton.addEventListener('click', handleCookieAccept)
    }

    const settingsUI = document.querySelector<HTMLDivElement>(`[flowappz-cookie-settings-wrapper="true"]`)
    if (settingsUI) {
        settingsUI.style.display = 'none'
    }

    const manageSettingsButtons = document.querySelectorAll<HTMLElement>('[flowappz-cookie-command="manage-settings"]')
    manageSettingsButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (settingsUI) settingsUI.style.display = 'flex'
        })
    })

    const closeSettingsButton = document.querySelector<HTMLElement>(`[flowappz-cookie-command="close-settings"]`)
    if (closeSettingsButton && settingsUI) {
        closeSettingsButton.addEventListener('click', () => (settingsUI.style.display = 'none'))
    }

    const closePopUpButtons = document.querySelectorAll<HTMLElement>(`[flowappz-cookie-command="close-cookie-popup"]`)
    closePopUpButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const cookiePopUp = document.querySelector<HTMLElement>(`[flowappz-cookie-popup="true"]`)
            if (cookiePopUp) cookiePopUp.style.display = 'none'
        })
    })

    makeCookieTogglersInteractive()
}

function preventDefaultFormSubmit(): void {
    const elements = document.querySelectorAll<HTMLElement>(`[flowappz-cookie-settings-wrapper="true"] [type="submit"]`)
    elements.forEach((el) => el.removeAttribute('type'))
}

function shouldShowCookiePopup(): boolean {
    const cookie = document.cookie.split(';').find((c) => c.includes('hidePopup'))
    return !cookie
}

// function setCookieToHidePopup(hidePeriod: string): void {
//     let numberOfDays = 30
//
//     if (hidePeriod === 'FOREVER') numberOfDays = 10 * 365
//     else if (hidePeriod === 'ONE_YEAR') numberOfDays = 365
//     else if (hidePeriod === 'SIX_MONTH') numberOfDays = 30 * 6
//     else if (hidePeriod === 'THREE_MONTH') numberOfDays = 30 * 3
//
//     const today = new Date()
//     const expiryDate = new Date(today.setDate(today.getDate() + numberOfDays))
//     document.cookie = `hidePopup=true; Path=/; Expires=${expiryDate.toUTCString()}`
// }

function hidePopupByDefault(): void {
    styleSheetToHidePopup = new CSSStyleSheet()

    styleSheetToHidePopup.replaceSync(`
    [flowappz-cookie-popup="true"] {
      display: none;
    }
  `)

    document.adoptedStyleSheets.push(styleSheetToHidePopup)
}

// async function deleteCookiesUsingCookieStore(): Promise<void> {
//     const cookies = await cookieStore.getAll()
//
//     for (let cookie of cookies) {
//         const { name, domain, path } = cookie
//         if (name.trim() !== 'hidePopup') await cookieStore.delete({ name, domain, path })
//     }
// }

// function expireCookies(): void {
//     document.cookie
//         .split(';')
//         .filter((c) => c.split('=')[0].trim() !== 'hidePopup')
//         .forEach((c) => {
//             const cookieKey = c.split('=')[0]
//             document.cookie = `${cookieKey}=; Path=/; Expires=${new Date().toUTCString()}`
//             document.cookie = `${cookieKey}=; Path=/; Expires=${new Date().toUTCString()}; domain=.${window.location.host}`
//         })
// }

function makeCookieTogglersInteractive(): void {
    const togglers = document.querySelectorAll<HTMLInputElement>(`[flowappz-cookie-choice]`)

    togglers.forEach((toggler) => {
        toggler.addEventListener('change', () => {
            const key = toggler.getAttribute('flowappz-cookie-choice')
            if (key && key in cookiePreferences) {
                cookiePreferences[key] = toggler.checked
            }
        })
    })
}

// async function loadCookiePopup(): Promise<void> {
//     if (!shouldShowCookiePopup()) {
//         return
//     }
//
//     makeCookieTogglersInteractive()
//
//     const siteId = document.querySelector('html')?.getAttribute('data-wf-site')
//     if (siteId) {
//         const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cookie-consent/sites/${siteId}`)
//         if (res.ok) {
//             const data = await res.json()
//
//             if (!data.cookiePopupEnabled) return
//
//             cookiePopupHidePeriod = data.cookiePopupHidePeriod
//         }
//     }
//
//     cookiePopup = document.getElementById('flowappz-cookie-consent')
//     if (!cookiePopup) console.error('Cookie popup is enabled but can not find the container!')
//     else {
//         cookiePopup.style.display = 'flex'
//         cookiePopup.style.zIndex = '99999'
//     }
// }

async function connectToGoogleAnalytics(siteId: string): Promise<void> {
    try {
        initializeGoogleTagCookieWithDefaultConfig()
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cookie-consent/sites/${siteId}`)
        if (res.ok) {
            const data = await res.json()
            loadGoogleAnalyticsScript(data.googleAnalyticsId)
        }
    } catch (err) {
        console.log('Error: ', err)
    }
}

function initializeGoogleTagCookieWithDefaultConfig(): void {
    try {
        const gtagFunctionDeclarationScript = document.createElement('script')
        gtagFunctionDeclarationScript.setAttribute('foo', 'true')
        gtagFunctionDeclarationScript.textContent = `
    // Define dataLayer and the gtag function.
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    `
        document.head.appendChild(gtagFunctionDeclarationScript)

        const userPreferenceCookie = document.cookie.split(';').find((c) => c.startsWith('cookiePreferences'))
        const savedUserPreferences = userPreferenceCookie ? JSON.parse(userPreferenceCookie.split('=')?.[1]) : null

        ;(window as any).gtag('consent', 'default', {
            ad_storage: savedUserPreferences?.marketing ? 'granted' : 'denied',
            ad_user_data: savedUserPreferences?.marketing ? 'granted' : 'denied',
            ad_personalization: savedUserPreferences?.personalization ? 'granted' : 'denied',
            analytics_storage: savedUserPreferences?.statistical ? 'granted' : 'denied',
            wait_for_update: savedUserPreferences ? 0 : 20000,
        })
    } catch (err) {
        console.log(`Error initializing Google tag with default state`, err)
    }
}

function loadGoogleAnalyticsScript(googleAnalyticsId: string): void {
    const googleAnalyticsScript = document.createElement('script')
    googleAnalyticsScript.async = true
    googleAnalyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`

    document.head.append(googleAnalyticsScript)

    const connectAnalyticsScript = document.createElement('script')
    connectAnalyticsScript.textContent = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${googleAnalyticsId}');
  `

    document.head.append(connectAnalyticsScript)
}

function updateGoogleTagCookieConfig(): void {
    try {
        const config = {
            ad_storage: cookiePreferences.marketing ? 'granted' : 'denied',
            ad_user_data: cookiePreferences.marketing ? 'granted' : 'denied',
            ad_personalization: cookiePreferences.personalization ? 'granted' : 'denied',
            analytics_storage: cookiePreferences.analytics ? 'granted' : 'denied',
        }

        ;(window as any).gtag('consent', 'update', config)
    } catch (err) {
        console.log(`Error updating Google tag config`, err)
    }
}

function cookiePreferencesExpiryDate(): Date {
    let numberOfDays = 30

    if (cookiePopupHidePeriod === 'FOREVER') numberOfDays = 10 * 365
    else if (cookiePopupHidePeriod === 'ONE_YEAR') numberOfDays = 365
    else if (cookiePopupHidePeriod === 'SIX_MONTH') numberOfDays = 30 * 6
    else if (cookiePopupHidePeriod === 'THREE_MONTH') numberOfDays = 30 * 3

    const today = new Date()
    return new Date(today.setDate(today.getDate() + numberOfDays))
}

function storeCookiePreferences(cookieSetup?: CookiePreferences): void {
    const expiryDate = cookiePreferencesExpiryDate()

    if (cookieSetup) {
        document.cookie = `cookiePreferences=${JSON.stringify(cookiePreferences)}; Path=/; Expires=${expiryDate.toUTCString()}`
        document.cookie = `hidePopup=true; Path=/; Expires=${expiryDate.toUTCString()}`
    } else {
        document.cookie = `cookiePreferences=${JSON.stringify(cookiePreferences)}; Path=/; Expires=${expiryDate.toUTCString()}`
        document.cookie = `hidePopup=true; Path=/; Expires=${expiryDate.toUTCString()}`
    }
}

// function handleCookieReject(): void {
//     if (cookiePopup) {
//         cookiePopup.style.display = 'none';
//     }
//
//     for (let key in cookiePreferences) {
//         cookiePreferences[key] = false;
//     }
//
//     storeCookiePreferences();
//     updateGoogleTagCookieConfig();
// }

function handleCookieAccept(): void {
    if (styleSheetToHidePopup) {
        styleSheetToHidePopup.disabled = false
    }
    const settingsUI = document.querySelector<HTMLElement>(`[flowappz-cookie-settings-wrapper="true"]`)
    if (settingsUI) {
        settingsUI.style.display = 'none'
    }
    storeCookiePreferences()
    updateGoogleTagCookieConfig()
    updateUiBasedOnCookiePreferences()
}

function handleAcceptAll(): void {
    if (styleSheetToHidePopup) {
        styleSheetToHidePopup.disabled = false
    }
    const settingsUI = document.querySelector<HTMLElement>(`[flowappz-cookie-settings-wrapper="true"]`)
    if (settingsUI) {
        settingsUI.style.display = 'none'
    }

    for (let key in cookiePreferences) {
        cookiePreferences[key] = true
    }

    storeCookiePreferences()
    updateGoogleTagCookieConfig()
    updateUiBasedOnCookiePreferences()
}

function handleRejectAll(): void {
    if (styleSheetToHidePopup) {
        styleSheetToHidePopup.disabled = false
    }
    const settingsUI = document.querySelector<HTMLElement>(`[flowappz-cookie-settings-wrapper="true"]`)
    if (settingsUI) {
        settingsUI.style.display = 'none'
    }

    for (let key in cookiePreferences) {
        if (key !== 'strictlyNecessary') {
            cookiePreferences[key] = false
        }
    }

    storeCookiePreferences()
    updateGoogleTagCookieConfig()
    updateUiBasedOnCookiePreferences()
}
