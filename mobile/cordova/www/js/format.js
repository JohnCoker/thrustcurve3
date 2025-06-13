/* exported formatMMTFromMKS */
function formatMMTFromMKS(n, fixed) {
  var mm, s;

  if (typeof n != 'number' || isNaN(n))
    return "";

  mm = n * 1000;
  if (mm > 10.4 && mm < 10.6)
    s = '10.5';
  else
    s = mm.toFixed(0);
  return s + 'mm';
}

/* exported formatImpulseFromMKS */
function formatImpulseFromMKS(n, fixed) {
  var s = formatFromMKS(n, 'force');
  if (/^[0-9]/.test(s))
    s += 's';
  return s;
}

/* exported formatBurnTime */
function formatBurnTime(n, fixed) {
  var s;

  if (typeof n != 'number' || isNaN(n) || n <= 0)
    return "";

  if (n >= 1 && !fixed)
    s = n.toFixed(1);
  else
    s = n.toFixed(2);
  return s + 's';
}

/* exported formatClassPercent */
function formatClassPercent(n) {
  var letter = 0,
      minImp = 0.0,
      maxImp = 2.5,
      percent;

  if (typeof n != 'number' || isNaN(n) || n <= 0)
    return "";

  percent = Math.round(100.0 * ((n - minImp) / (maxImp - minImp)));
  while (letter < 25 && percent > 100) {
    letter++;
    minImp = maxImp;
    maxImp *= 2;
    percent = Math.round(100.0 * ((n - minImp) / (maxImp - minImp)));
  }

  return percent.toFixed(0) + '% ' + String.fromCharCode(65 + letter);
}

/* exported formatCommonName */
function formatCommonName(s) {
  if (s == null || s === '')
    return '';

  s = s.replace(/\s+/g, '').replace(/-.*$/, '');

  if (/^1\/4A/.test(s))
    return '¼' + $.trim(s.substring(3));
  if (/^1\/2A/.test(s))
    return '½' + $.trim(s.substring(3));

  return s;
}

/* exported styleChartOptions */
function styleChartOptions(options) {
  var i;

  if (kendo.support.mobileOS.android) {
    options.theme = 'black';

    if (options.yAxis && options.yAxis.plotBands) {
      for (i = 0; i < options.yAxis.plotBands.length; i++)
        options.yAxis.plotBands[i].color = '#2b93d9';
    }
  }
}
