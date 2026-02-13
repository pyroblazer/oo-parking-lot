/**
 * Mock for @react-native-community/datetimepicker
 */

const React = require('react');

const DateTimePicker = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    ref,
    'data-testid': 'datetimepicker',
  });
});

DateTimePicker.propTypes = {
  value: require('prop-types').instanceOf(Date),
  mode: require('prop-types').oneOf(['date', 'time', 'datetime']),
  is24Hour: require('prop-types').bool,
  display: require('prop-types').oneOf(['default', 'compact', 'spinner', 'clock']),
  onChange: require('prop-types').func,
  maximumDate: require('prop-types').instanceOf(Date),
  minimumDate: require('prop-types').instanceOf(Date),
};

module.exports = DateTimePicker;
