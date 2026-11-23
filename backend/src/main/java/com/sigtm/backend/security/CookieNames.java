package com.sigtm.backend.security;

/** Nombres de cookies compartidos por el filtro JWT y la protección CSRF. */
public final class CookieNames {

    public static final String SESSION = "SIGTM_TOKEN";
    public static final String CSRF = "XSRF-TOKEN";
    public static final String CSRF_HEADER = "X-XSRF-TOKEN";

    private CookieNames() {
    }
}
