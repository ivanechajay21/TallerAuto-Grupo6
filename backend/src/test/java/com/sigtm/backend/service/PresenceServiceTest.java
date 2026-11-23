package com.sigtm.backend.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PresenceServiceTest {

    private final PresenceService presenceService = new PresenceService();

    @Test
    void marcaYDevuelveUsuariosEnLinea() {
        presenceService.marcarActivo(1L);
        presenceService.marcarActivo(2L);

        assertThat(presenceService.estaEnLinea(1L)).isTrue();
        assertThat(presenceService.estaEnLinea(2L)).isTrue();
        assertThat(presenceService.usuariosEnLinea()).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void ignoraUsuariosNulosYNoMarcados() {
        presenceService.marcarActivo(null);

        assertThat(presenceService.estaEnLinea(null)).isFalse();
        assertThat(presenceService.estaEnLinea(99L)).isFalse();
        assertThat(presenceService.usuariosEnLinea()).isEmpty();
    }
}
