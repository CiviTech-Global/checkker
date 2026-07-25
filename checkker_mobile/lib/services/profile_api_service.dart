import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'socket_service.dart' show ADDRESS_OF_SERVER;

final String _apiBase = '$ADDRESS_OF_SERVER/api/v1';

class ProfileApiService {
  final String? sessionToken;

  const ProfileApiService({this.sessionToken});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (sessionToken != null && sessionToken!.isNotEmpty)
          'Authorization': 'Bearer $sessionToken',
      };

  Future<Map<String, dynamic>> getMyProfile() async {
    final res = await http.get(Uri.parse('$_apiBase/users/me'), headers: _headers);
    return _decode(res);
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> input) async {
    final res = await http.patch(
      Uri.parse('$_apiBase/users/me'),
      headers: _headers,
      body: jsonEncode(input),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> changeUsername(String username) async {
    final res = await http.post(
      Uri.parse('$_apiBase/users/me/username'),
      headers: _headers,
      body: jsonEncode({'username': username}),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> uploadAvatar(File file) async {
    final request = http.MultipartRequest('POST', Uri.parse('$_apiBase/users/me/avatar'));
    if (sessionToken != null && sessionToken!.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $sessionToken';
    }
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }

  Future<Map<String, dynamic>> getPublicProfile(String username) async {
    final res = await http.get(
      Uri.parse('$_apiBase/users/${Uri.encodeComponent(username)}'),
      headers: _headers,
    );
    return _decode(res);
  }

  Future<List<dynamic>> listSessions() async {
    final res = await http.get(Uri.parse('$_apiBase/users/sessions'), headers: _headers);
    final data = _decode(res);
    return data['sessions'] as List<dynamic>? ?? [];
  }

  Future<void> revokeSession(String sessionId) async {
    await http.delete(
      Uri.parse('$_apiBase/users/sessions/$sessionId'),
      headers: _headers,
    );
  }

  Future<Map<String, dynamic>> requestAccountDeletion() async {
    final res = await http.post(Uri.parse('$_apiBase/users/me/delete'), headers: _headers);
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(res.body);
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
