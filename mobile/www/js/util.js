/* global LZString, Connection */

/* exported isPhone */
function isPhone() {
  return /phonegap=1/.test(window.location.href);
}

/* exported hasNetwork */
function hasNetwork() {
  if (!isPhone())
    return true;
  try {
    return (navigator.connection && navigator.connection.type != Connection.NONE);
  } catch (e) {
    return true;
  }
}

/* exported escapeAttr */
function escapeAttr(s) {
  return ('' + s).replace(/&/g, '&amp;')
                 .replace(/"/g, '&quot;');
}

/* exported escapeHtml */
function escapeHtml(s) {
  return ('' + s).replace(/&/g, '&amp;')
                 .replace(/'/g, '&apos;')
                 .replace(/"/g, '&quot;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;');
}

/* exported setupSelect */
function setupSelect(input, data, specific) {
  var i, label, value;

  if (kendo.ui.DropDownList)
    input.kendoDropDownList();

  input.empty();
  if (!specific) {
    input.append('<option value="">any</option>');
  }
  if (data != null && data instanceof Array) {
    for (i = 0; i < data.length; i++) {
      if (typeof data[i] == 'object') {
        label = data[i].label || 'Unknown';
        value = data[i].value || '?';
      } else {
        label = value = data[i];
      }
      input.append('<option value="' + escapeAttr(value) + '">' + escapeHtml(label) + '</option>');
    }
  }
}

/* exported setupUnits */
function setupUnits(input, unit) {
  var li, label;

  unit = getUnit(unit);

  li = input.closest('li');
  label = $.trim(li.text());
  label = label.replace(/ *\([^)]*\)$/, "");
  label += " (" + unit.label + ")";

  li.empty().text(label).append(input);
}

/* exported updateSelect */
function updateSelect(input, value) {
  if (value == null || value === '')
    input.val('');
  else
    input.val(value);
}

/* exported setupListForm */
function setupListForm(form, onSubmit) {
  // make sure return triggers submit
  form.find('input[type=number]').unbind("keyup");
  form.find('input').on("keyup", function(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      $(this).blur();
      onSubmit(e);
    }
  });
  form.submit(onSubmit);
}

/* exported setInputNumber */
function setInputNumber(input, value, digits) {
  var text;

  if (typeof digits != 'number')
    digits = 2;

  if (typeof value != 'number' || isNaN(value))
    text = '';
  else {
    text = value.toFixed(digits);
    text = text.replace(/^([^.]*\.[0-9])0+$/, "$1");
  }
  input.val(text);
}

/* exported setInputDimension */
function setInputDimension(input, value, unit) {
  var text;

  unit = getUnit(unit);
  value = convertFromMKS(value, unit);

  if (typeof value != 'number' || isNaN(value))
    text = '';
  else {
    text = value.toFixed(unit.digits);
    text = text.replace(/^([^.]*\.[0-9])0+$/, "$1");
  }
  input.val(text);
}

/* exported getInputNumber */
function getInputNumber(input) {
  var text, value;

  text = $.trim(input.val());
  value = parseFloat(text);
  if (isNaN(value) || value <= 0)
    return null;
  else
    return value;
}

/* exported getInputDimension */
function getInputDimension(input, unit) {
  var text, value;

  text = $.trim(input.val());
  value = parseFloat(text);
  if (isNaN(value) || value <= 0)
    return null;

  return convertToMKS(value, unit);
}

/* exported loadStorage */
function loadStorage(key) {
  var raw = window.localStorage.getItem(key),
      text;

  if (raw != null && raw !== '') {
    try {
      text = LZString.decompress(raw);
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
}

/* exported saveStorage */
function saveStorage(key, value) {
  var text, compressed;

  window.localStorage.removeItem(key);
  if (value != null && value !== '') {
    try {
      text = JSON.stringify(value);
      compressed = LZString.compress(text);
      window.localStorage.setItem(key, compressed);
    } catch (e) {
      window.localStorage.removeItem(key);
      return false;
    }
  }
}

/* exported removeStorage */
function removeStorage(key) {
  window.localStorage.removeItem(key);
}

/* exported doAlert */
function doAlert(title, msg) {
  if (typeof KendoApp == 'object' && typeof KendoApp.hideLoading == 'function')
    KendoApp.hideLoading();

  if (arguments.length == 1) {
    title = 'Error';
    msg = arguments[0];
  }
  if (navigator.notification)
    navigator.notification.alert(msg, null, title);
  else
    setTimeout(function() { alert(msg); }, 1);
}

/* exported doConfirm */
function doConfirm(title, msg, callback) {
  if (arguments.length == 2) {
    title = 'Confirm';
    msg = arguments[0];
    callback = arguments[1];
  }
  if (navigator.notification) {
    navigator.notification.confirm(msg, function(chosen) {
      if (chosen == 1)
        callback();
    }, title);
  } else {
    setTimeout(function() {
      if (confirm(msg))
        callback();
    }, 1);
  }
}

/* exported toId */
function toId(v, member) {
  if (v == null)
    return;

  if (typeof v == 'number')
    return v;

  if (typeof v == 'object') {
    if (!member)
      member = 'id';
    if (typeof v[member] == 'number')
      return v[member];
  }

  if (typeof v == 'string') {
    v = parseInt(v);
    if (!isNaN(v))
      return v;
  }
}

/* exported isNumber */
function isNumber(v) {
  return v != null && !isNaN(v);
}

/* exported isPositive */
function isPositive(v, min) {
  if (min == null)
    return isNumber(v) && v > 0;
  else
    return isNumber(v) && v >= min;
}

/* exported parseResponseErrors */
function parseResponseErrors(xhr) {
  var text, xml, msg;

  if (xhr == null || xhr.responseText == null)
    return;
  try {
    // remove processing instructions
    text = xhr.responseText.replace(/^<?[^>]*>\s*/g, '');

    // parse XML now
    xml = $.parseXML(text);
  } catch (e) {
    return;
  }
  $(xml).find('error').each(function() {
    msg = $(this).text();
  });
  return msg;
}

/* exported showPrompt */
function showPrompt(prompt) {
  var dur;

  if (Options.rotatePrompts) {
    prompt.show();

    dur = Options.promptDuration;
    if (dur > 0) {
      setTimeout(function() {
        if (prompt.is(':visible'))
          prompt.fadeOut('slow');
      }, dur * 1000);
    }
  } else {
    prompt.hide();
  }
}
