import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'socket_service.dart';

/// A Checkker server discovered on the local network.
class DiscoveredHost {
  final String address;
  final int port;

  const DiscoveredHost({required this.address, required this.port});
}

/// Lightweight LAN helper that discovers the device's local IP and lets
/// a guest connect to a host running a Checkker server on the same network.
class LanService {
  static final LanService _instance = LanService._internal();
  factory LanService() => _instance;
  LanService._internal();

  static const _discoveryPort = 47831;
  static const _discoveryProbe = 'CHECKKER_DISCOVER';

  String? _localIp;
  String? get localIp => _localIp;

  /// Discover Checkker servers on the LAN via UDP broadcast (the server runs
  /// a discovery beacon on udp/47831 — see apps/server/src/index.ts).
  Future<List<DiscoveredHost>> discoverHosts({
    Duration timeout = const Duration(seconds: 2),
  }) async {
    final hosts = <String, DiscoveredHost>{};
    RawDatagramSocket? socket;
    try {
      socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      socket.broadcastEnabled = true;
      final probe = utf8.encode(_discoveryProbe);
      socket.send(probe, InternetAddress('255.255.255.255'), _discoveryPort);

      final completer = Completer<void>();
      final sub = socket.listen((event) {
        if (event != RawSocketEvent.read) return;
        final dg = socket!.receive();
        if (dg == null) return;
        try {
          final json = jsonDecode(utf8.decode(dg.data)) as Map<String, dynamic>;
          if (json['service'] == 'checkker') {
            final address = dg.address.address;
            hosts[address] = DiscoveredHost(
              address: address,
              port: json['port'] as int? ?? 3001,
            );
          }
        } catch (_) {
          // Ignore malformed replies.
        }
      });
      // Re-send the probe halfway through in case the first packet dropped.
      Future.delayed(timeout ~/ 2, () {
        try {
          socket?.send(probe, InternetAddress('255.255.255.255'), _discoveryPort);
        } catch (_) {}
      });
      Future.delayed(timeout, () {
        if (!completer.isCompleted) completer.complete();
      });
      await completer.future;
      await sub.cancel();
    } catch (_) {
      // Discovery is best-effort; fall back to manual entry.
    } finally {
      socket?.close();
    }
    return hosts.values.toList();
  }

  /// Best-effort local IPv4 discovery. Falls back to loopback for emulators.
  Future<String?> discoverLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLinkLocal: false,
      );
      for (final ni in interfaces) {
        for (final addr in ni.addresses) {
          final ip = addr.address;
          // Skip loopback and mobile data interfaces when possible.
          if (ip.startsWith('127.') || ip.startsWith('0.')) continue;
          // Prefer Wi-Fi-like prefixes.
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            _localIp = ip;
            return _localIp;
          }
        }
      }
      // Fallback to first non-loopback address.
      for (final ni in interfaces) {
        for (final addr in ni.addresses) {
          final ip = addr.address;
          if (!ip.startsWith('127.') && !ip.startsWith('0.')) {
            _localIp = ip;
            return _localIp;
          }
        }
      }
    } catch (_) {
      // Ignore; emulator may throw.
    }
    _localIp = '127.0.0.1';
    return _localIp;
  }

  /// Connect the shared SocketService to a specific host:port on the LAN.
  /// Returns true if a connection attempt was started. Actual success is
  /// reported through [SocketService.connectedStream].
  bool connectToLanHost(String host, {int port = 3001}) {
    final trimmed = host.trim();
    if (trimmed.isEmpty) return false;
    // Normalize: strip any accidental protocol or port from the host string.
    var bareHost = trimmed;
    if (bareHost.contains('://')) {
      final parts = bareHost.split('://');
      bareHost = parts.length > 1 ? parts[1] : bareHost;
    }
    if (bareHost.contains(':')) {
      final parts = bareHost.split(':');
      if (parts.length == 2 && int.tryParse(parts[1]) != null) {
        bareHost = parts[0];
      }
    }
    final url = 'http://$bareHost:$port';
    SocketService().setServerUrl(url);
    SocketService().reconnect();
    return true;
  }

  /// Return to the default remote server.
  void reconnectToDefault(String defaultUrl) {
    SocketService().setServerUrl(defaultUrl);
    SocketService().reconnect();
  }
}
