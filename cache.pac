function FindProxyForURL(url, host)
{
  var US="127.0.0.1:10000";

  if (shExpMatch(host, "www.pandora.com")) return "SOCKS "+US;

  return "DIRECT";
}
