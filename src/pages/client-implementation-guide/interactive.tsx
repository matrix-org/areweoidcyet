import {
  SpinnerIcon,
  RestartIcon,
  CopyIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import { useStore } from "@nanostores/react";
import { Alert, Button, Form, Link } from "@vector-im/compound-web";
import { atom, computed, task, type WritableAtom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import type React from "react";
import { useEffect, useState } from "react";
import cx from "classnames";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";

import styles from "./style.module.css";

const baseUrl = new URL(import.meta.env.BASE_URL, import.meta.env.SITE);
const clientUri = baseUrl.toString();
const redirectUri = new URL(
  "client-implementation-guide/callback",
  baseUrl,
).toString();

const queryClient = atom(new QueryClient());
const csApi = persistentAtom<string>(
  "cs-api",
  "https://synapse-oidc.element.dev/",
);
const issuer = persistentAtom<string>(
  "issuer",
  "https://auth-oidc.element.dev/",
);
const state = persistentAtom<string>("state", "ieXei8ohb7miesie");
const serverMetadata = persistentAtom<ServerMetadata>(
  "server-metadata",
  {
    authorization_endpoint: "https://auth-oidc.element.dev/authorize",
    token_endpoint: "https://auth-oidc.element.dev/oauth2/token",
    registration_endpoint: "https://auth-oidc.element.dev/oauth2/registration",
    device_authorization_endpoint:
      "https://auth-oidc.element.dev/oauth2/device",
  },
  { encode: JSON.stringify, decode: JSON.parse },
);
const clientId = persistentAtom<string | null>("client-id", null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});
const codeVerifier = persistentAtom<string>(
  "code-verifier",
  "ahlae7FuMahCeeseip6Shooqu6aefai5xoocea5gav2",
);
const codeChallenge = computed(codeVerifier, (codeVerifier) =>
  task(() => computeCodeChallenge(codeVerifier)),
);
const code = persistentAtom("code");
const accessToken = persistentAtom<string | null>("access-token", null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});
const refreshToken = persistentAtom("refresh-token");
const deviceCode = persistentAtom("device-code");
const userCode = persistentAtom("user-code");
const verificationUri = persistentAtom(
  "verification-uri",
  "https://auth-oidc.element.dev/link",
);

const computeCodeChallenge = async (codeVerifier: string): Promise<string> => {
  // Hash the verifier
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  // Base64 encode the hash
  let str = "";
  const bytes = new Uint8Array(hash);
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const LoadingIndicator = () => (
  <SpinnerIcon className={cx(styles.spinner)} />
);

export const CsApiInput = () => {
  const $csApi = useStore(csApi);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = formData.get("cs-api");
    if (typeof value !== "string") throw new Error();
    csApi.set(value);
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root onSubmit={onSubmit} className={cx(styles.form)}>
        <Form.Field name="cs-api">
          <Form.Label>Matrix C-S API root</Form.Label>
          <Form.TextControl
            type="url"
            required
            defaultValue={$csApi}
            placeholder="https://matrix-client.matrix.org/"
          />
          <Form.ErrorMessage match="valueMissing">
            This field is required
          </Form.ErrorMessage>
          <Form.ErrorMessage match="typeMismatch">
            This must be a valid URL
          </Form.ErrorMessage>
        </Form.Field>
        <Form.Submit size="sm" kind="secondary">
          Save
        </Form.Submit>
      </Form.Root>
    </div>
  );
};

type FetcherProps = {
  url: string;
  label: string;
  onSave: (data: unknown) => void;
};

const Fetcher: React.FC<FetcherProps> = ({
  url,
  label,
  onSave,
}: FetcherProps) => {
  const client = useStore(queryClient);
  const { isError, data, error, isFetching, refetch } = useQuery(
    {
      retry: false,
      queryKey: [url],
      queryFn: async () => {
        const res = await fetch(url);
        const data = await res.json();
        onSave(data);
        return data;
      },
      enabled: false,
    },
    client,
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root onSubmit={onSubmit} className={cx(styles.form)}>
        <Form.Field name="cs-api">
          <Form.Label>Endpoint</Form.Label>
          <Form.TextControl type="url" readOnly value={url} />
          <Form.ErrorMessage match="valueMissing">
            This field is required
          </Form.ErrorMessage>
          <Form.ErrorMessage match="typeMismatch">
            This must be a valid URL
          </Form.ErrorMessage>
        </Form.Field>

        {data && <DataViewer data={data} />}

        {isError && (
          <Alert type="critical" title="There was an error fetching">
            {error.toString()}
          </Alert>
        )}

        <div className={cx(styles["button-stack"])}>
          <Form.Submit disabled={isFetching} size="sm" kind="secondary">
            {isFetching && <LoadingIndicator />}
            {label}
          </Form.Submit>
        </div>
      </Form.Root>
    </div>
  );
};

const randomString = (length: number): string => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

type RandomStringFormProps = {
  length: number;
  minLength?: number;
  atom: WritableAtom<string>;
};

export const RandomStringField: React.FC<RandomStringFormProps> = ({
  length,
  minLength,
  atom,
}: RandomStringFormProps) => {
  const currentValue = useStore(atom);
  const onRefreshClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    atom.set(randomString(length));
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    atom.set(e.target.value);
  };

  return (
    <>
      <div className={cx(styles["icon-and-button"])}>
        <Form.TextControl
          className={cx(styles.mono)}
          type="text"
          required
          value={currentValue}
          onChange={onChange}
          minLength={minLength}
          placeholder="Random string"
        />
        <Button
          iconOnly
          size="sm"
          Icon={RestartIcon}
          kind="secondary"
          onClick={onRefreshClick}
        />
      </div>
      <Form.ErrorMessage match="valueMissing">
        This field is required
      </Form.ErrorMessage>
      <Form.ErrorMessage match="tooShort">Value is too short</Form.ErrorMessage>
    </>
  );
};

export const AuthParametersForm = () => {
  const $codeChallenge = useStore(codeChallenge);

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root className={cx(styles.form)}>
        <Form.Field name="state">
          <Form.Label>State</Form.Label>
          <RandomStringField length={16} atom={state} />
        </Form.Field>

        <Form.Field name="code-verifier">
          <Form.Label>Code verifier</Form.Label>
          <RandomStringField minLength={43} length={43} atom={codeVerifier} />
        </Form.Field>

        <Form.Field name="code-challenge">
          <Form.Label>
            Code challenge = <code>BASE64URL(SHA256(code verifier))</code>
          </Form.Label>
          <Form.TextControl
            className={cx(styles.mono)}
            type="text"
            readOnly
            value={$codeChallenge}
          />
        </Form.Field>
      </Form.Root>
    </div>
  );
};

export const AuthIssuerFetcher = () => {
  const $csApi = useStore(csApi);
  const endpoint = new URL(
    "/_matrix/client/unstable/org.matrix.msc2965/auth_issuer",
    $csApi,
  );

  const onSave = (data: unknown) => {
    issuer.set((data as { issuer: string }).issuer);
  };

  return (
    <Fetcher url={endpoint.toString()} onSave={onSave} label="Fetch issuer" />
  );
};

type ServerMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  device_authorization_endpoint: string;
};

export const OidcMetadataFetcher = () => {
  const $issuer = useStore(issuer);
  const endpoint = new URL(".well-known/openid-configuration", $issuer);

  const onSave = (data: unknown) => {
    serverMetadata.set(data as ServerMetadata);
  };

  return (
    <Fetcher
      url={endpoint.toString()}
      onSave={onSave}
      label="Fetch server parameters"
    />
  );
};

const DataViewer: React.FC<{ data: unknown }> = ({
  data,
}: {
  data: unknown;
}) => {
  return (
    <textarea
      readOnly
      className={cx(styles["output-data"], "cpd-theme-dark")}
      value={JSON.stringify(data, null, 2)}
    />
  );
};

export const ClientMetadataForm: React.FC<{ grantTypes: string[] }> = ({
  grantTypes,
}) => {
  const $serverMetadata = useStore(serverMetadata);
  const [clientName, setClientName] = useState("Client implementation guide");
  const [response, setResponse] = useState<null | object>(null);
  const client = useStore(queryClient);
  const mutation = useMutation(
    {
      mutationFn: async (clientMetadata: object): Promise<void> => {
        // Let's cheat a little bit and add the 'contacts' that is required for now
        const metadata = {
          ...clientMetadata,
          contacts: ["mailto:hello@example.com"],
        };

        const res = await fetch($serverMetadata.registration_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        setResponse(data);
        const { client_id } = data as { client_id: string };
        clientId.set(client_id);
      },
    },
    client,
  );

  const hasAuthorizationCodeGrant = grantTypes.includes("authorization_code");

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientName(e.target.value);
  };

  const clientMetadata: Record<string, unknown> = {
    application_type: "web",
    client_name: clientName,
    client_uri: clientUri,
    token_endpoint_auth_method: "none",
    grant_types: grantTypes,
  };

  if (hasAuthorizationCodeGrant) {
    clientMetadata.redirect_uris = [redirectUri];
    clientMetadata.response_types = ["code"];
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(clientMetadata);
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root className={cx(styles.form)} onSubmit={onSubmit}>
        <Form.Field name="client-name">
          <Form.Label>Client name</Form.Label>
          <Form.TextControl
            type="text"
            required
            value={clientName}
            onChange={onChange}
            placeholder="Client implementation guide"
          />
          <Form.ErrorMessage match="valueMissing">
            This field is required
          </Form.ErrorMessage>
        </Form.Field>

        <Form.Field name="endpoint">
          <Form.Label>Registration endpoint</Form.Label>
          <Form.TextControl
            type="url"
            readOnly
            value={$serverMetadata.registration_endpoint}
          />
        </Form.Field>

        <DataViewer data={clientMetadata} />

        <Form.Submit size="sm" kind="secondary">
          Submit client metadata
        </Form.Submit>

        {response && <DataViewer data={response} />}
      </Form.Root>
    </div>
  );
};

export const DeviceCodeRequestForm = () => {
  const $clientId = useStore(clientId) || "";
  const $serverMetadata = useStore(serverMetadata);
  const $queryClient = useStore(queryClient);

  const [response, setResponse] = useState<null | object>(null);

  const mutation = useMutation(
    {
      mutationFn: async (): Promise<void> => {
        const params = {
          client_id: $clientId,
          scope:
            "urn:matrix:org.matrix.msc2967.client:api:* urn:matrix:org.matrix.msc2967.client:device:ABCDEFGHIJKL",
        } satisfies Record<string, string>;

        const body = new URLSearchParams(params).toString();

        const res = await fetch($serverMetadata.device_authorization_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        });

        const data = await res.json();
        setResponse(data);

        if ("device_code" in data && typeof data.device_code === "string") {
          deviceCode.set(data.device_code);
        }

        if ("user_code" in data && typeof data.user_code === "string") {
          userCode.set(data.user_code);
        }

        if (
          "verification_uri" in data &&
          typeof data.verification_uri === "string"
        ) {
          verificationUri.set(data.verification_uri);
        }
      },
    },
    $queryClient,
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root className={cx(styles.form)} onSubmit={onSubmit}>
        <Form.Field name="endpoint">
          <Form.Label>Device authorization endpoint</Form.Label>
          <Form.TextControl
            type="url"
            readOnly
            value={$serverMetadata.device_authorization_endpoint}
          />
        </Form.Field>
        <Form.Field name="client-id">
          <Form.Label>Client ID</Form.Label>
          <Form.TextControl type="text" required readOnly value={$clientId} />
          {!$clientId && (
            <Form.ErrorMessage>
              Client must be registered to get one
            </Form.ErrorMessage>
          )}
        </Form.Field>

        <Form.Submit size="sm" kind="secondary" disabled={!$clientId}>
          Start device authorization flow
        </Form.Submit>

        {response && <DataViewer data={response} />}
      </Form.Root>
    </div>
  );
};

export const DeviceCodeQrCode = () => {
  const $queryClient = useStore(queryClient);
  const $verificationUri = useStore(verificationUri);
  const $userCode = useStore(userCode);

  const mutation = useMutation(
    {
      mutationFn: async (code: string): Promise<void> => {
        await navigator.clipboard.writeText(code);
      },
      onSettled: () => {
        setTimeout(() => {
          mutation.reset();
        }, 2000);
      },
    },
    $queryClient,
  );

  return (
    <div className={cx(styles["qr-code"])}>
      <QRCodeSVG value={$verificationUri} />
      <Link target="_blank" href={$verificationUri}>
        {$verificationUri}
      </Link>
      {$userCode ? (
        <>
          <Form.MFAInput
            className={cx(styles.code)}
            readOnly
            value={$userCode}
          />
          <Button
            Icon={CopyIcon}
            kind="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              if ($userCode === "") return;
              mutation.mutate($userCode);
            }}
            disabled={$userCode === "" || mutation.status !== "idle"}
          >
            {mutation.status === "success" ? "Copied!" : "Copy code"}
          </Button>
        </>
      ) : (
        "Start the device authorisation flow to get a code"
      )}
    </div>
  );
};

export const CodeExchangeForm = () => {
  const $clientId = useStore(clientId) || "";
  const $serverMetadata = useStore(serverMetadata);
  const $codeVerifier = useStore(codeVerifier);
  const $code = useStore(code);
  const $queryClient = useStore(queryClient);

  const [response, setResponse] = useState<null | object>(null);

  const mutation = useMutation(
    {
      mutationFn: async (code: string): Promise<void> => {
        const params = {
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: $clientId,
          code_verifier: $codeVerifier,
        } satisfies Record<string, string>;

        const body = new URLSearchParams(params).toString();

        const res = await fetch($serverMetadata.token_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        });

        const data = await res.json();
        setResponse(data);

        if ("access_token" in data && typeof data.access_token === "string") {
          accessToken.set(data.access_token);
        }

        if ("refresh_token" in data && typeof data.refresh_token === "string") {
          refreshToken.set(data.refresh_token);
        }
      },
    },
    $queryClient,
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = data.get("code") as string;
    mutation.mutate(code);
  };

  const onCodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const input = e.currentTarget.value;
    code.set(input);
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root className={cx(styles.form)} onSubmit={onSubmit}>
        <Form.Field name="endpoint">
          <Form.Label>Token endpoint</Form.Label>
          <Form.TextControl
            type="url"
            readOnly
            value={$serverMetadata.token_endpoint}
          />
        </Form.Field>
        <Form.Field name="grant-type">
          <Form.Label>Grant type</Form.Label>
          <Form.TextControl type="text" readOnly value="authorization_code" />
        </Form.Field>
        <Form.Field name="client-id">
          <Form.Label>Client ID</Form.Label>
          <Form.TextControl type="text" required readOnly value={$clientId} />
          {!$clientId && (
            <Form.ErrorMessage>
              Client must be registered to get one
            </Form.ErrorMessage>
          )}
        </Form.Field>
        <Form.Field name="code-verifier">
          <Form.Label>Code verifier</Form.Label>
          <Form.TextControl type="text" readOnly value={$codeVerifier} />
        </Form.Field>
        <Form.Field name="code">
          <Form.Label>Code</Form.Label>
          <Form.TextControl
            type="text"
            value={$code}
            onInput={onCodeInput}
            required
          />
          <Form.ErrorMessage match="valueMissing">
            This field is required
          </Form.ErrorMessage>
        </Form.Field>

        <Form.Submit size="sm" kind="secondary" disabled={!$clientId}>
          Exchange code for access token
        </Form.Submit>

        {response && <DataViewer data={response} />}
      </Form.Root>
    </div>
  );
};

export const DeviceCodeExchangeForm = () => {
  const $clientId = useStore(clientId) || "";
  const $serverMetadata = useStore(serverMetadata);
  const $deviceCode = useStore(deviceCode) || "";
  const $queryClient = useStore(queryClient);

  const [response, setResponse] = useState<null | object>(null);

  const mutation = useMutation(
    {
      mutationFn: async (): Promise<void> => {
        const params = {
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: $deviceCode,
          client_id: $clientId,
        } satisfies Record<string, string>;

        const body = new URLSearchParams(params).toString();

        const res = await fetch($serverMetadata.token_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        });

        const data = await res.json();
        setResponse(data);

        if ("access_token" in data && typeof data.access_token === "string") {
          accessToken.set(data.access_token);
        }

        if ("refresh_token" in data && typeof data.refresh_token === "string") {
          refreshToken.set(data.refresh_token);
        }
      },
    },
    $queryClient,
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root className={cx(styles.form)} onSubmit={onSubmit}>
        <Form.Field name="endpoint">
          <Form.Label>Token endpoint</Form.Label>
          <Form.TextControl
            type="url"
            readOnly
            value={$serverMetadata.token_endpoint}
          />
        </Form.Field>
        <Form.Field name="grant-type">
          <Form.Label>Grant type</Form.Label>
          <Form.TextControl
            type="text"
            readOnly
            value="urn:ietf:params:oauth:grant-type:device_code"
          />
        </Form.Field>
        <Form.Field name="client-id">
          <Form.Label>Client ID</Form.Label>
          <Form.TextControl type="text" required readOnly value={$clientId} />
          {!$clientId && (
            <Form.ErrorMessage>
              Client must be registered to get one
            </Form.ErrorMessage>
          )}
        </Form.Field>
        <Form.Field name="device-code">
          <Form.Label>Code</Form.Label>
          <Form.TextControl type="text" value={$deviceCode} readOnly />
          {!$deviceCode && (
            <Form.ErrorMessage>No device code available</Form.ErrorMessage>
          )}
        </Form.Field>

        <Form.Submit size="sm" kind="secondary" disabled={!$clientId}>
          Poll with device code
        </Form.Submit>

        {response && <DataViewer data={response} />}
      </Form.Root>
    </div>
  );
};

export const RefreshTokenForm = () => {
  const $refreshToken = useStore(refreshToken) || "";
  const $queryClient = useStore(queryClient);
  const $clientId = useStore(clientId) || "";
  const $serverMetadata = useStore(serverMetadata);

  const [response, setResponse] = useState<null | object>(null);

  const mutation = useMutation(
    {
      mutationFn: async (): Promise<void> => {
        const params = {
          grant_type: "refresh_token",
          refresh_token: $refreshToken,
          client_id: $clientId,
        } satisfies Record<string, string>;

        const body = new URLSearchParams(params).toString();

        const res = await fetch($serverMetadata.token_endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        });

        const data = await res.json();
        setResponse(data);

        if ("access_token" in data && typeof data.access_token === "string") {
          accessToken.set(data.access_token);
        }

        if ("refresh_token" in data && typeof data.refresh_token === "string") {
          refreshToken.set(data.refresh_token);
        }
      },
    },
    $queryClient,
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className={cx(styles["form-wrapper"])}>
      <Form.Root onSubmit={onSubmit} className={cx(styles.form)}>
        <Form.Field name="endpoint">
          <Form.Label>Token endpoint</Form.Label>
          <Form.TextControl
            type="url"
            readOnly
            value={$serverMetadata.token_endpoint}
          />
        </Form.Field>

        <Form.Field name="grant-type">
          <Form.Label>Grant type</Form.Label>
          <Form.TextControl type="text" readOnly value="refresh_token" />
        </Form.Field>

        <Form.Field name="client-id">
          <Form.Label>Client ID</Form.Label>
          <Form.TextControl type="text" required readOnly value={$clientId} />
          {!$clientId && (
            <Form.ErrorMessage>
              Client must be registered to get one
            </Form.ErrorMessage>
          )}
        </Form.Field>

        <Form.Field name="refresh-token">
          <Form.Label>Refresh token</Form.Label>
          <Form.TextControl
            type="text"
            required
            readOnly
            value={$refreshToken}
          />
          {!$refreshToken && (
            <Form.ErrorMessage>No refresh token available</Form.ErrorMessage>
          )}
        </Form.Field>

        <Form.Submit
          size="sm"
          kind="secondary"
          disabled={!$refreshToken || !$clientId}
        >
          Refresh token
        </Form.Submit>

        {response && <DataViewer data={response} />}
      </Form.Root>
    </div>
  );
};

export const CurrentCsApiRoot = (): string => useStore(csApi);
export const AuthIssuerEndpoint = (): string => {
  const $csApi = useStore(csApi);
  const endpoint = new URL(
    "/_matrix/client/unstable/org.matrix.msc2965/auth_issuer",
    $csApi,
  );

  return endpoint.toString();
};

export const CurrentIssuer = (): string => useStore(issuer);
export const OidcDiscoveryDocument = (): string => {
  const $issuer = useStore(issuer);
  const endpoint = new URL("/.well-known/openid-configuration", $issuer);
  return endpoint.toString();
};

export const CurrentState = (): string => useStore(state);
export const CurrentClientId = (): string => `${useStore(clientId)}`;
export const CurrentAccessToken = (): string => `${useStore(accessToken)}`;

export const DisplayAuthorizationUrl: React.FC = () => {
  const $state = useStore(state);
  const $metadata = useStore(serverMetadata);
  const $codeChallenge = useStore(codeChallenge);
  const $clientId = useStore(clientId);

  const params = {
    response_type: "code",
    response_mode: "fragment",
    client_id: $clientId || "",
    redirect_uri: redirectUri,
    scope:
      "urn:matrix:org.matrix.msc2967.client:api:* urn:matrix:org.matrix.msc2967.client:device:ABCDEFGHIJKL",
    state: $state,
    code_challenge_method: "S256",
    code_challenge: $codeChallenge || "",
  } satisfies Record<string, string>;

  const query = new URLSearchParams(params).toString();
  const fullUrl = new URL($metadata.authorization_endpoint);
  fullUrl.search = query;

  return (
    <div className={cx(styles["authorization-url"], "cpd-theme-dark")}>
      <div className={cx(styles.base)}>{$metadata.authorization_endpoint}</div>
      {Object.entries(params).map(([key, value], index) => (
        <div key={key} className={cx(styles.param)}>
          {index === 0 ? "?" : "&"}
          {key} ={" "}
          {value === "" ? <b>{"<missing>"}</b> : encodeURIComponent(value)}
        </div>
      ))}

      <Button
        as="a"
        disabled={$clientId === null}
        href={fullUrl.toString()}
        size="sm"
        kind="secondary"
        target="_blank"
      >
        Start authorization flow
      </Button>
    </div>
  );
};

export const CallbackParameters = () => {
  const hash = window.location?.hash || "";
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(stripped);

  useEffect(() => {
    if (params.get("code")) {
      code.set(params.get("code") as string);
    }
  }, [params]);

  return <DataViewer data={Object.fromEntries(params)} />;
};
