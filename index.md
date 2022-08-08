---
image: https://areweoidcyet.com/assets/images/logo.png
---
[![Matrix](/assets/images/matrix-logo-white.svg)](https://matrix.org){: .logo} _Last updated: 2022-08-08_

```

                                       _     _                   _   ___ 
  __ _ _ __ ___  __      _____    ___ (_) __| | ___   _   _  ___| |_/ _ \
 / _` | '__/ _ \ \ \ /\ / / _ \  / _ \| |/ _` |/ __| | | | |/ _ \ __\// /
| (_| | | |  __/  \ V  V /  __/ | (_) | | (_| | (__  | |_| |  __/ |_  \/ 
 \__,_|_|  \___|   \_/\_/ \___|  \___/|_|\__,_|\___|  \__, |\___|\__| () 
                                                      |___/              
```

# Not Yet.

[What?](#what) • [Why?](#why) • [When?/Status](#when) • [FAQs](#faqs)

<a id="what"></a>
## What?

This site is being used to track the progress of [Matrix](https://matrix.org) migrating to OIDC for authentication. You can join the discussion at [#matrix-auth:matrix.org](https://matrix.to/#/#matrix-auth:matrix.org).

We have also set up the [Matrix OIDC Playground](https://github.com/vector-im/oidc-playground) which contains Homeservers, OIDC Providers and Clients for you to try out.

<a id="why"></a>

## Why?

For detailed background on the rationale to this project please see [MSC3861](https://github.com/matrix-org/matrix-spec-proposals/pull/3861).

***TL;DR** Currently Matrix uses a custom authentication protocol baked in to the Matrix spec. This poses a number of drawbacks. To overcome these drawbacks we are working to migrate to use OIDC instead.*

<a id="when"></a>

## When?

Good question. There are a number of moving parts to this project which are outlined below.

Jump to:
- [Spec](#spec)
- [Homeservers](#homeservers)
- [Clients](#clients)
- [OIDC Providers](#oidc-providers)
- [Migration support](#migration)

<a id="spec"></a>

### Matrix Spec

Related MSCs:

| Proposal | Status | Implementations |
| - | - | - |
| [MSC3861: Matrix architecture change to delegate authentication via OIDC](https://github.com/matrix-org/matrix-spec-proposals/pull/3861) | ✅ Draft but ready for review once dependencies are also ready | n/a |
| [MSC2964: Delegation of auth from homeserver to OIDC Provider](https://github.com/matrix-org/matrix-spec-proposals/pull/2964) | 🚧 Draft | 🚧 Partial implementations in the [Playground](https://github.com/vector-im/oidc-playground) |
| [MSC2965: OIDC Provider discovery](https://github.com/matrix-org/matrix-spec-proposals/pull/2965) | ✅ Draft, but feature complete | ✅ Available in the [Playground](https://github.com/vector-im/oidc-playground) |
| [MSC2966: Usage of OAuth 2.0 Dynamic Client Registration in Matrix](https://github.com/matrix-org/matrix-spec-proposals/pull/2966) | 🚧 Draft | ✅ Available in the [Playground](https://github.com/vector-im/oidc-playground) |
| [MSC2967: API scopes](https://github.com/matrix-org/matrix-spec-proposals/pull/2967) | 🚧 Not yet feature complete | 🚧 Partially implemented |
| [MSC3824: OIDC-aware clients](https://github.com/matrix-org/matrix-spec-proposals/pull/3824) | ✅ Draft, but feature complete | ✅ Available in the [Playground](https://github.com/vector-im/oidc-playground#clientsapplications-to-try)|

Outstanding key decision points:

- How will UIA protected endpoints work?
- How does guest access work?

<a id="homeservers"></a>

### Homeservers

| <strong>Requirement</strong> | <strong>Relevant specs</strong> |  | <strong>Synapse</strong> | <strong>Dendrite</strong> |
| - | - | - | - | - |
| Specify OP to be used in /.well-known/matrix/client  | <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2965">MSC2965</a> | REQUIRED | ✅ | ❌ |
| Token verification and introspection | RFC7662 | REQUIRED | ✅ using RFC7662 Token Introspection but probably want to also support plain short lived JWT  | ❌ |
| <a href="https://github.com/matrix-org/matrix-authentication-service/issues/118">UIA/re-auth for sensitive actions</a> |  🚧 Not yet defined | REQUIRED | ❌ | ❌ |
| Auto-provisioning of Matrix device | MSC2964 | REQUIRED | ✅ | ❌ |
| Auto-provision Matrix user based on token introspection |  | REQUIRED | ✅ | ❌ |
| Receive and process sign out notifications from OP | 🚧 | REQUIRED | ❌ <a href="https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html#delete-a-device">Could use existing delete a device endpoint</a> | ❌ |
| Receive and process account deletion from OP | 🚧 | REQUIRED | ❌ <a href="https://matrix-org.github.io/synapse/latest/admin_api/user_admin_api.html#deactivate-account">Could use existing deactivate account endpoint</a> | ❌ |
| Specify OP web UI in .well-known as account |  | RECOMMENDED | ✅ | ❌ |
| GET /_matrix/client/v3/capabilities should include <code>{ "capabilities": { "m.change_password": { "enabled": false } } }</code> |  | REQUIRED | ✅ by ensuring password auth is off | ❌ |

n.b. this is currently all in a [branch of Synapse](https://github.com/sandhose/synapse/tree/quenting/oauth-delegation) rather than in mainline.

<a id="clients"></a>

### Clients

[MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824) proposes four types of Matrix client:

1. **OIDC native client** - This is a client that fully uses OIDC when talking to an OIDC enabled homeserver.
1. **OIDC aware client** - This is a client that is aware of OIDC but will still use existing auth types (e.g. `m.login.sso`) to auth with an OIDC enabled homeserver.
1. **Legacy client with SSO support** - This is a client that is not aware of OIDC but does support `m.login.sso` flow. e.g. Element Web, iOS, Android, Fluffy, Nheko, Cinny
1. **Legacy client without SSO support** - This is a client that is not aware of OIDC at all and nor does it support `m.login.sso` flow. Typically auth is done via `m.login.password` only. e.g. Fractal

#### OIDC Native clients

[Client implementation guide](./client-implementation-guide)

| <strong>Requirement</strong> | <strong></strong> | <strong>Relevant spec(s)</strong> | <strong>Hydrogen</strong> | <strong>Files SDK Demo</strong> | <strong>Element Web</strong> | <strong>Element iOS</strong> | <strong>Element Android</strong> | <strong>Element X iOS</strong> |
| - | - | - | - | - | - | - | - | - |
| Discovery of OP in /.well-known/matrix/client | REQUIRED | <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2965">MSC2965</a> | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Discovery of OP web UI in /.well-known/matrix/client and outbound linking to it | RECOMMENDED | <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2965">MSC2965</a> | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dynamic client registration | REQUIRED | <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2966">MSC2966</a> and <a href="https://datatracker.ietf.org/doc/html/rfc7591">RFC7591 OAuth 2.0 Dynamic Client Registration Protocol</a> | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Signup flow - prompt=create | REQUIRED |  | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Login flow -  no prompt param | REQUIRED |  | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Refresh token handling | REQUIRED | <a href="https://openid.net/specs/openid-connect-core-1_0.html">OpenID Connect Core 1.0</a> | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sign out - Token revocation | REQUIRED | <a href="https://datatracker.ietf.org/doc/html/rfc7009">RFC7009 Token Revocation</a> | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| <a href="https://github.com/matrix-org/matrix-authentication-service/issues/118">Re-auth for sensitive actions</a> | REQUIRED | 🚧 The spec for this is not yet complete | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

#### OIDC Aware clients

These are the requirements for a client to be OIDC-aware from [MSC3824](https://github.com/matrix-org/matrix-spec-proposals/blob/hughns/sso-redirect-action/proposals/3824-oidc-aware-clients.md#definition-of-oidc-aware):

|Requirement| |Relevant spec(s)|Element Web|Element iOS|Element Android|
|--- |--- |--- |--- |--- |--- |
| Support the `m.login.sso` auth flow | REQUIRED | [Matrix Spec](https://spec.matrix.org/latest/client-server-api/#sso-client-login) | ✅ | ✅ | ✅ |
|Where a `delegated_oidc_compatibility` value of `true` is present on an `m.login.sso` then only offer that auth flow to the user|RECOMMENDED|[MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824)|🎓 [PR](https://github.com/matrix-org/matrix-react-sdk/pull/8681)|❌|🚧 [PR](https://github.com/vector-im/element-android/pull/6367)|
| Append `action=login` and `action=register` parameters to the SSO redirect URLs|RECOMMENDED|[MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824)|🎓 [PR](https://github.com/matrix-org/matrix-react-sdk/pull/8681)|❌|🚧 [PR](https://github.com/vector-im/element-android/pull/6367)|
|Sign post and link users to manage their account at the OP web UI given by MSC2965|RECOMMENDED|[MSC2965](https://github.com/matrix-org/matrix-spec-proposals/pull/2965) and [MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824)|🎓 [PR](https://github.com/matrix-org/matrix-react-sdk/pull/8681)|❌|❌|
| Label the SSO button as "Continue"|RECOMMENDED|[MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824)|🎓 [PR](https://github.com/matrix-org/matrix-react-sdk/pull/8681)|❌|🚧 [PR](https://github.com/vector-im/element-android/pull/6367)|

<a id="oidc-providers"></a>

### OIDC Providers

| <strong>Requirement</strong> | <strong>Purpose</strong> | <strong></strong> | <strong>Matrix Auth Service</strong> | <strong>Keycloak</strong> | <strong>Okta</strong> | <strong>Auth0</strong> |
| - | - | - | - | - | - | - |
| Support for <a href="https://openid.net/specs/openid-connect-core-1_0.html">OpenID Connect Core 1.0</a> |  | REQUIRED | ✅ | ✅ | ✅ | ✅ |
| Support for <a href="https://openid.net/specs/openid-connect-discovery-1_0.html">OpenID Connect Discovery 1.0</a> without auth | To allow Matrix client and HS to know how to interact with OP <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2965">MSC2965</a> | REQUIRED | ✅ | ✅ | ✅ | ✅ |
| OP => HS notification of sign out | Session/device management | REQUIRED | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/111">Planned</a> | Would need a keycloak event listener that then made outbound HTTP requests in some format supported by the HS | TODO: look at extension points in Okta | Use <a href="https://auth0.com/docs/customize/log-streams/custom-log-streams">https://auth0.com/docs/customize/log-streams/custom-log-streams</a> to push events to HS |
| OP => HS notification of deactivation |  | REQUIRED | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/146">Planned</a> | ❌ Would need a keycloak event listener that then made outbound HTTP requests in some format supported by the HS | ❌ TODO: look at extension points in Okta | ❌ Use <a href="https://auth0.com/docs/customize/log-streams/custom-log-streams">https://auth0.com/docs/customize/log-streams/custom-log-streams</a> to push events to HS |
| <a href="https://datatracker.ietf.org/doc/html/rfc7009">RFC7009 Token Revocation</a> | Allow Matrix client to logout their own session | REQUIRED | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/144">Planned</a> | ✅ | ✅ | ✅ <a href="https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens">But, refresh tokens only</a> |
| RFC7662 OAuth Token Introspection or Short lived JWT Or some other agreed scheme | Allow HS to check validity and capabilities of access token with OP | REQUIRED | ✅ RFC7662 | ✅ RFC7662 | ✅ RFC7662 | 🚧 JWT - which currently isn’t supported by Synapse |
| RFC7636 OAuth PKCE | Protection against authorization code interception attack | REQUIRED | ✅ | ✅ | ✅ | ✅ |
| Web UI for managing sessions | Can optionally use an id_token_hint param as detailed in <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2965">MSC2965</a> | RECOMMENDED | 🚧 In progress | ✅ User Account Service | ✅ | ❌ |
| Support for <code>urn:matrix:client:api:*</code> scope | Basic API permissioning | REQUIRED | ✅ | ✅ | ✅ | ✅ |
| 🚧 Support for <code>urn:matrix:client:uia:*</code> scopes | Permissioning for UIA endpoints | REQUIRED | 🚧 | 🚧 | 🚧 | 🚧 
| Handle device ID custom scope <code>urn:matrix:client:device:XXXXXXXX</code> | Session/device management | REQUIRED | ✅ | ✅Using dynamic-scopes feature | ❌ it is unclear if this is possible | ❌ it is unclear if this is possible |
| OpenID Connect Dynamic Client Registration in conformance with <a href="https://github.com/matrix-org/matrix-spec-proposals/pull/2966">MSC2966</a> | Allow a HS to accept logins from any Matrix client | OPTIONAL | 🚧 <a href="https://github.com/matrix-org/matrix-authentication-service/issues/17">In progress</a> | ✅ But, request is blocked by CORS on web | ❌An API token is required to call the registration endpoint | ✅ <a href="https://auth0.com/docs/get-started/applications/dynamic-client-registration">Yes</a> |
| T&C opt-in for registration | Where HS admin wants it | OPTIONAL | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/22">Planned</a> | ✅ <a href="https://www.keycloak.org/docs/latest/server_admin/#proc-enabling-terms-conditions_server_administration_guide">Yes</a> | ❌ No | ❌ <a href="https://auth0.com/docs/secure/data-privacy-and-compliance/gdpr/gdpr-track-consent-with-custom-ui">Unclear</a> |
| reCAPTCHA for registration | Where HS admin wants it | OPTIONAL | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/138">Planned</a> | ✅ <a href="https://www.keycloak.org/docs/latest/server_admin/#proc-enabling-recaptcha_server_administration_guide">Yes</a> | ✅ <a href="https://developer.okta.com/docs/reference/api/captchas/">Yes</a> | ✅ <a href="https://auth0.com/docs/secure/attack-protection/bot-detection">Yes</a> |
| <a href="https://matrix-org.github.io/synapse/latest/openid.html">Support for upstream OIDC Provider</a> | Single Sign On/social login | OPTIONAL | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/19">Planned</a> | ✅ | ✅ | ✅ |
| <a href="https://matrix-org.github.io/synapse/latest/usage/configuration/user_authentication/single_sign_on/saml.html">Support for upstream SAML provider</a> | Single Sign On | OPTIONAL | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/159">Planned</a> | ✅ | ✅ | ✅ |
| <a href="https://matrix-org.github.io/synapse/latest/usage/configuration/user_authentication/single_sign_on/cas.html">Support for upstream CAS provider</a> | Single Sign On | OPTIONAL | ❌ <a href="https://github.com/matrix-org/matrix-authentication-service/issues/160">Planned</a> | ? | ? | ? |
| Allow user to add multiple email addresses and verify them | Allow HS to use email as target for notifications. Also used for Identity Server? | OPTIONAL | ✅ | ❌ Would need extension | ❌ <a href="https://support.okta.com/help/s/question/0D51Y00006cnHn1SAE/activation-email-to-secondary-email-address?language=en_US">Only one additional email </a>+ no verification(?) | ❌ <a href="https://community.auth0.com/t/can-we-verify-additional-emails/49545">Additional custom fields</a> but no verification |
| Allow user to add phone numbers and verify them | ? | OPTIONAL | ❌ |  |  | ❌ |
| Those email address and phone number exposed via ID token and or user info endpoint |  |  |  |  |  |  |

<a id="migration"></a>

### Migration support

| <strong>Capability</strong> | <strong>Synapse</strong> | <strong>Dendrite</strong> |
| - | - | - |
| Compatibility layer so that non-OIDC native clients can connect to OIDC enabled Homeserver | 🚧 In progress via Matrix Auth Service | ❌ Not required? |
| Ability for auth server to run embedded within process | ❌ Planned via Matrix Auth Service | ❌ Not required? |
| Ability to migrate existing password user into Matrix Auth Service | ❌ Planned | ❌ Desirable? |
| Ability to migrate existing SSO users into Matrix Auth Service | ❌ Planned | Not required - no SSO support at present |
| Ability to migrate existing access tokens into Matrix Auth Service | ❌ Planned - requires client to support refresh tokens? | ? |

<a id="faqs"></a>

## FAQs

### Are we going to migrate existing accounts over?

That will depend on the homeserver administrator. In the case of the matrix.org homeserver we will.

We are planning to implement a number of migration capabilities outlined [above](#migration).

### Will I lose my old-style login/password?

Assuming that your homeserver migrates you to an OIDC Provider that supports username/password login then you will still be able to use that to sign in.

However, you will be entering your username/password into a UI controlled by the OIDC Provider, not the client.

### How do I do social login with this?

Similar to how the homeserver achieves this today, the OIDC Provider can act as an identity broker and support login via upstream social (and other) identity providers.

### How does this work with QR code login?

The [RFC8628](https://datatracker.ietf.org/doc/html/rfc8628) OIDC device authorization grant (aka "device flow") can be used to allow login on a device using a second device.

An implementation of this is available to try in the [OIDC Playground](https://github.com/vector-im/oidc-playground).

It can work a bit like this:

![Device Flow demo 2](https://user-images.githubusercontent.com/6955675/180743561-e2e158cd-2caf-4e43-9eed-9e86da84597c.gif)

### What do I do for my Nintendo 3DS which doesn't have a web browser?

OIDC provides at least two flows that could help with this:

1. Use the [*Device Authorization Grant*](https://oauth.net/2/device-flow) (a.k.a. "device flow") to complete the login on a secondary device that does have a web browser. On the QR flow demo above you can see an example URL and code that would be used on the second device.
2. Use a [*Resource Owner Password Credentials Grant*](https://oauth.net/2/grant-types/password/) (a.k.a. "password grant" or "direct grant") where the username and password are entered into the client (i.e. the 3DS) and the client then sends the username and password to the OIDC Provider to get an access token.

It is important to note that the second option (Resource Owner Password Credentials Grant) is considered insecure by the [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics-20#section-2.4) guide. As such, it is expected that the presence of this capability in an OIDC Provider can not be relied on. For example, we don't expect that matrix.org will support this flow.

### How will this work with E2EE?

It works in the same way that the current password login works: login is separate from E2EE setup.

That said, there are some scenarios that OIDC can help with. For example, when signing in to a new device you can use the OIDC device flow on an existing login to both authorise the sign in and also verify the new device for E2EE.

### Does this mean I can't combine E2EE & account password?

In short, yes.

The reason for this is that there isn't a standard OIDC/OAuth grant that allows for a trusted client to authenticate using a PAKE mechanism meaning that the password can remain in the client.

If the client was to just sent the password to the OIDC Provider like it does today then the E2EE could be broken by the OIDC Provider/homeserver operator.

Part of the reason why there isn't a grant for this use case is that the OIDC model is predicated on the idea that the client is considered low on the trust ladder and so shouldn't be trusted with the credentials.

However, with our use case for E2EE the client is high on the trust ladder as it is necessarily responsible for the E2EE integrity.

So, arguably a custom grant using PAKE could be used and not break the trust model in Matrix.

### Are you really rebuilding all of Keycloak in matrix-authentication-service?!

Hopefully not! In the same way that Matrix is not an authentication protocol, it also doesn't make sense to completely reinvent the wheel.

As to how far we will get... it will most likely depend on what we need for migration support.

### Will clients need to support both old-style and new-style auth?

For a period of time, yes.

Similarly, some homeservers (depending on how they are being used) will need to support both old-style (non-OIDC) and new-style (OIDC) client auth for a period of time.

### How do I migrate from my existing SSO to new-style OIDC?

You could either get your existing clients to re-login via OIDC or we are planning for being able to migrate existing SSO logins and access tokens over to the matrix-authentication-service OP.

### Does this mean that the login page/screen's branding won't match the branding of my app any more?

Assuming that you are following best practise and not using the Resource Owner Password Credentials Grant, then: yes, the branding on the login form is under the control of the homeserver administrator not the client.

That said, if you are operating your own client and homeserver then you can brand and customise both as you wish.

The openness of the Matrix ecosystem is a defining feature. That a user can choose which client and homeserver to use is a key part of that.

We believe that, by adopting the OIDC model and making the division between the client and homeserver more explicit, we can better build trust in the open ecosystem and allow it to continue to grow and flourish.

The branding trade-off is an interesting aspect of this: yes, as a client implementor you may lose some control over the branding of the login page. However, you gain from where the user has already signed in on their device - the user does not need to reauthenticate to use your client.
