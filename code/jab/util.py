from __future__ import absolute_import

import os
import subprocess
import sys
import time
from fabric.api import (
  abort,
  env,
  execute,
  hide,
  local,
  prompt,
  serial,
  settings,
  show,
  sudo,
  task,
  with_settings,
)
from functools import wraps
from pipes import quote  # shlex.quote in 3.3

from colors import (
  blue,
  green,
  red,
  white,
  yellow,
)

def _quote_arg(arg):
  if ' ' in arg or '"' in arg or '\'' in arg:
    return '"' + arg.replace('\\', '\\\\').replace('"', '\\"') + '"'
  else:
    return arg

def quote_shell_command(command):
  return ' '.join(map(_quote_arg, command))

COMMAND = quote_shell_command([
  arg for arg in sys.argv[1:] if not arg.startswith('--fabfile=')
])
ROOT = os.path.realpath(os.path.dirname(__file__) + '/../..')
DEFAULT_MESSAGE = 'Are you sure you want to proceed?'

def bool_arg(value):
  return {
    'false': False, 'off': False, 'no': False, 'n': False, '0': False,
    'true': True, 'on': True, 'yes': True, 'y': True, '1': True,
  }[value.lower()] if not type(value) is bool else value

def import_missing(module):
  exctype, exc = sys.exc_info()[:2]

  print red('Error:', bold=True), 'Missing module', module
  print str(exc)
  print 'To fix the issue please run:'
  print '$', white('sudo pip install %s' % module, bold=True)
  sys.exit(1)

def deep_merge(*dicts):
  'Merge multiple dictionaries together, recursively whne both are dicts'
  result = {}
  for arg in dicts:
    for k, v in arg.items():
      if type(result.get(k)) == dict and type(v) == dict:
        result[k] = deep_merge(result[k], v)
      else:
        result[k] = v
  return result

def get_host_names():
  names = []
  for host in env.hosts:
    names.append(replace_filter.get_name(host))
  return names


def proceed(message=DEFAULT_MESSAGE, default=True):
  answers = {
    'y': True,
    'yes': True,
    'n': False,
    'no': False,
    '': default,
  }
  default_text = {False: 'n', True: 'y'}[default]

  # Allow auto_proceed environment flag
  if os.environ.get('AUTO_PROCEED'):
    print yellow('Auto-proceed:', bold=True), message
    print yellow('Taking default option:'), yellow(default_text, bold=True)
    return default

  suggestion = ' [y/n]'
  result = prompt(message + suggestion).strip().lower()
  while not result in answers:
    print red('Could not interpret answer: '), repr(result)
    result = prompt(message + suggestion).strip().lower()
  return answers[result]


def proceed_or_abort(message=DEFAULT_MESSAGE):
  if not proceed(message):
    abort('Aborting as user requested not to proceed.')


def status(message):
  print '\n' + blue(message)


def warn(message):
  print '\n' + red(message, bold=True)


def subcmd(command):
  'Prints the command being run and then returns it to be run.'
  print '[LOCAL] %s' % command
  return command


def wait_ssh(host, timeout=30, check_password=True):
  status('Waiting for %d seconds for %s to respond to ssh' % (timeout, host))
  for attempt in range(1, timeout + 1):
    print 'Trying to connect... (attempt %d)' % attempt
    try:
      subprocess.check_output([
        'ssh',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ConnectTimeout=5',
        '-o', 'PasswordAuthentication=no',
        host,
        '/bin/true'
      ], stderr=subprocess.STDOUT)
      break
    except subprocess.CalledProcessError as e:
      if not check_password:
        # If we not checking the password and got a permission denied, thats good!
        if 'Permission denied' in e.output and e.returncode == 255:
          return True
      time.sleep(1)


def global_command(fn):
  @wraps(fn)
  @serial
  @with_settings(parallel=False)
  def _task(*args, **kw):
    if not env.hosts:
      abort('There were no hosts available to run on')

    assert env.host_string in env.hosts

    # Only run the function on the first host of the list
    if env.hosts[-1] == env.host_string:
      return fn(*args, **kw)
    else:
      return None

  return _task

def parallel_command(fn):
  @with_settings(show('running'), warn_only=False)
  def _per_machine(*args, **kw):
    try:
      fn(*args, **kw)
      return True
    except Exception as e:
      return str(e)

  @wraps(fn)
  @global_command
  def _task(*args, **kw):
    with settings(hide('running'), warn_only=True, parallel=True):
      results = execute(_per_machine, *args, **kw)

      errors = {
        server: result for server, result in results.items()
        if result != True
      }

      if errors:
        print red('There were %d failures:' % len(errors), bold=True)
        for (server, result) in errors.items():
          print '* %s: %s' % (server, repr(result))

        # Remove all the failed hosts so future commands don't run on them
        failed_hosts = errors.keys()
        env.hosts = [host for host in env.hosts if host not in failed_hosts]

        if len(errors) < len(results):
          okay = len(results) - len(errors)
          print yellow('The remaining %d hosts were successful' % okay, bold=True)
      else:
        print green('Success on %d hosts' % len(results), bold=True)

  return _task

@task
@parallel_command
def test_parallel():
  'Test output with global/per_machine tasks'
  sudo('if [ "$((RANDOM % 4))" -eq "0" ]; then echo fail && exit 1; fi; echo win')
  return True

@task
@global_command
def test_global():
  'Test output with global/per_machine tasks'
  print white('THIS SHOULD ONLY APPEAR ONCE', bold=True)
  execute(test_parallel)
  execute(test_parallel)
  execute(test_parallel)

