# Matrix client OIDC implementation guide

a.k.a. How to make your Matrix client OIDC-native

> n.b. The plan is that this document will become a doc on matrix.org. Please feel free to make edits/comments/suggestions etc.

If you only want to make the client [OIDC-aware as per MSC3824](https://github.com/matrix-org/matrix-spec-proposals/pull/3824) then see the [client requirements section](https://github.com/matrix-org/matrix-spec-proposals/blob/hughns/sso-redirect-action/proposals/3824-oidc-aware-clients.md#definition-of-oidc-aware) of the MSC.

When implementing an OIDC-native client you can test against the [OIDC Playground](https://github.com/element-hq/oidc-playground) where a number of Homeservers are available in different configurations.

# Useful terminology

- OpenID Connect (OIDC) - the protocol being used to authenticate a user and acquire an access token to use with a homeserver
- OpenID Provider (OP) - the OIDC compatible server that is capable of issuing access tokens
- Issuer - the OP that is being used to issue access tokens for a particular homeserver

# Requirements

## Discovery and client registration

There are two steps to get started:

1. Discovery - determining which OP is being used by a Homeserver to issue access tokens (or if OIDC is not supported)
2. Client registration - obtaining a `client_id` [+ `client_secret`] to use when interacting with the OP

**Discovery**

To determine whether a Homeserver is using auth delegated via OIDC you make use of [MSC2965](https://github.com/matrix-org/matrix-spec-proposals/pull/2965) and check the `/.well-known/matrix/client`. The presence of org.matrix.msc2965.authentication indicates that homeserver is using OIDC.

e.g. from [https://synapse-oidc.element.dev/.well-known/matrix/client](https://synapse-oidc.element.dev/.well-known/matrix/client)

```
{
  "m.homeserver": {
    "base_url": "https://synapse-oidc.element.dev/"
  },
  "org.matrix.msc2965.authentication": {
    "issuer": "https://auth-oidc.element.dev/",
    "account": "https://auth-oidc.element.dev/account"
  }
}
```

**Client registration**

Unless your client has been statically registered with the OpenID Provider you will need to make use of what is known as “dynamic client registration”. This is described in [MSC2966](https://github.com/matrix-org/matrix-spec-proposals/pull/2966) which makes use of [RFC7591](https://datatracker.ietf.org/doc/html/rfc7591).

It is not always that case that an OP will support dynamic client registration. If this is the case and the client doesn’t already know of a static `client_id` then you make an HTTP request against the OP passing metadata to describe the client.

The client registration is currently implemented on a per-device basis. The client should store the client ID it is assigned (mapped to the specific homeserver) as this will be needed when refreshing tokens.

> **A note on dynamic client registration:**
> If you have used OIDC for auth in an app previously then you may be surprised to see that the client needs to be dynamically registered instead of statically.
> This is due to the open nature of the Matrix eco-system where by default any client can be used to connect to any HS.
> In the legacy (non-OIDC) architecture it is implicit that any client can connect to any HS, whereas in OIDC architecture it becomes explicit: each client either needs to be pre-registered with a HS/OP or the HS/OP allows clients to dynamically register.

You can test dynamic client registration against the `synapse-oidc.element.dev` homeserver in the [OIDC Playground](https://github.com/element-hq/oidc-playground).

**Recommended flows**

Here are the recommended flows depending on whether your client also supports “legacy” (non-OIDC) auth:

![Discovery with legacy fallback](./discovery%20with%20fallback.png)

![Discovery without legacy fallback](./discovery%20without%20fallback.png)

## User Login and User Registration

This is a typical OAuth/OIDC login flow. [PKCE](https://www.rfc-editor.org/rfc/rfc7636.html) is mandated in order to follow security best practises.

One notable change from before is that you need to generate a device ID yourself whereas with legacy auth the Homeserver would create a device ID for you if you didn’t specify one.

Once you have generated the device ID (e.g. `ABCDEFGHIJKL`) you then use it in the scope parameter of the request.

There are three scopes that you need to request access to:

- `openid` - standard OIDC scope 
- `urn:matrix:org.matrix.msc2967.client:api:*` - gives full access to Client Server API. See [MSC2967: API scopes](https://github.com/matrix-org/matrix-spec-proposals/pull/2967) for details of future scopes
- `urn:matrix:org.matrix.msc2967.client:device:<generated device ID>` - e.g. `urn:matrix:org.matrix.msc2967.client:device:ABCDEFGHIJKL`

So, a complete scope would be:

`openid urn:matrix:org.matrix.msc2967.client:api:* urn:matrix:org.matrix.msc2967.client:device:ABCDEFGHIJKL`

You can use the `prompt=create` to indicate that this is a new user registration.

An example from a hydrogen running on localhost is: (whitespace added just for readability)

```
GET /auth?
  response_mode=fragment&
  response_type=code&
  redirect_uri=http%3A%2F%2Flocalhost%3A3000&
  client_id=hydrogen-oidc-playground&
  state=MaH7aaDB&
  scope=openid+urn%3Amatrix%3Aorg.matrix.msc2967.client%3Aapi%3A*+urn%3Amatrix%3Aorg.matrix.msc2967.client%3Adevice%3AjtiAHHIr1T&
  nonce=A2Iat6Y2&
  code_challenge_method=S256&
  code_challenge=d9UAwn-QGjq6wp-hVfu2INVpFiZ5kQih4hYpoRPoPFk
```

## Access token handling

The most important point to understand here is that the OpenID Provider is now responsible for issuing tokens and the homeserver isn’t involved in this process anymore.

Additionally, access tokens are issued with an expiration date so token refresh handling is a requirement of the implementation too.

## Logout

The steps for a client to follow is:

1. Revoke the access and refresh tokens with the OP using [RFC7009 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009)
2. Destroy any local state
3. (Re)direct a browser user-agent to [RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html) endpoint so that the user can be logged out of the OP if they wish

## Account management

The OP is now responsible for providing an account management UI.

The client is responsible for sign-posting the user to the account management UI.

For example, in Element Web the sign-posting looks like this:

![Example with legacy fallback](./account%20management.png)

The OP is expected to provide the following capabilities:

- viewing other signed in devices and sessions
- signing out other devices and sessions
- changing password if applicable
- deleting/deactivating the account

If applicable the OP can also provide capabilities:

- associating email and MSISDN with the account
- linking to upstream identity providers (e.g. Google, Facebook, Twitter, etc)

# Differences compare to legacy auth

## User registration

The OP is responsible for the user interface for registration. The only responsibility the client has is to indicate to the OP if the user is wishing to register vs login (via the `prompt=create` param).

## User login

Again, the OP is responsible for show the user interface for login.

## Client is agnostic to underlying auth type

The client no longer needs to know whether the user is authenticating using password or some upstream social or SSO provider. All are treated the same.

## Client must explicitly register it's existence with the OP

In legacy auth any client could connect to any homeserver by default. In OIDC auth the client must be registered with the OP before it can connect to the HS/OP.

This can either be done statically (e.g. the client is pre-registered with the OP) or dynamically (e.g. the client registers itself with the OP).

## Device IDs

Matrix device IDs must be explicitly generated by the client instead of the homeserver allocating one. This is because the client needs to know the device ID in order to request the correct scope from the OP.

## Refresh tokens

The client must implement refresh token handling whereas it was previouslt optional.

## 3PID management

The OP is now responsible for adding and validating email and MSISDN 3PIDs. The client no longer needs to present a UI for this.

The client can still query the available 3PIDs for the purpose of setting up notifications.

## Password management

Password management related operations including reset and account recovery must be managed entirely by the oP.

## Signing out other devices

This must now be done via the OP account management UI.

## Account deactivation

This must now be done via the OP account management UI.

# Client libraries

Some SDKs that can help with this work:

| Library | MSC2965 Issuer discovery | RFC7591 Client Registration | Access token handling | RFC7009 Logout | Device Flow | Sample usage |
|---|---|---|---|---|---|---|
| [Matrix Rust SDK](https://github.com/matrix-org/matrix-rust-sdk) | ? | ? | ? | ? | ? | |
| [AppAuth-JS](https://github.com/openid/AppAuth-JS) | ❌ | ❌ | ✅ | ✅ | ❌ | |
| [AppAuth-iOS](https://github.com/openid/AppAuth-iOS) | ❌ | ✅ | ✅ | ❌ | ✅ | |
| [AppAuth-Android](https://github.com/openid/AppAuth-Android)| ❌ | ✅ | ✅ | ❌ | 🚧 [PR](https://github.com/openid/AppAuth-Android/pull/763) | |
| [oidc-client-ts](https://github.com/authts/oidc-client-ts) | ❌ | ❌ | ✅ | ✅ | 🚧 [Branch](https://github.com/hughns/oidc-client-ts/tree/hughns/device-flow) | files-sdk-demo |


More can be found at [https://openid.net/developers/certified/](https://openid.net/developers/certified/) under the Certified Relying Party Libraries section.

# Implementation examples

- Hydrogen - [https://github.com/sandhose/hydrogen-web/blob/sandhose/oidc-login/src/matrix/net/OidcApi.ts](https://github.com/sandhose/hydrogen-web/blob/sandhose/oidc-login/src/matrix/net/OidcApi.ts)
- files-sdk-demo - [https://github.com/element-hq/files-sdk-demo/blob/oidc/src/ClientManager.ts](https://github.com/vector-im/files-sdk-demo/blob/oidc/src/ClientManager.ts)
