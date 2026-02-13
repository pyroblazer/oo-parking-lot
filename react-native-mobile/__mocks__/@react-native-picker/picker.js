const React = require('react');
const { View, Text, TouchableOpacity } = require('react-native');

const Picker = ({ children, selectedValue, onValueChange, style, testID }) => {
  const [value, setValue] = React.useState(selectedValue);
  
  React.useEffect(() => {
    setValue(selectedValue);
  }, [selectedValue]);
  
  const handleChange = (newValue) => {
    setValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };
  
  return (
    <View style={style} testID={testID}>
      <Text testID={`${testID}-value`}>{value}</Text>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            onPress: () => handleChange(child.props.value),
            selected: child.props.value === value,
          });
        }
        return child;
      })}
    </View>
  );
};

Picker.Item = ({ label, value, onPress, selected }) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{ opacity: selected ? 1 : 0.5 }}
      testID={`picker-item-${value}`}
    >
      <Text>{label}</Text>
    </TouchableOpacity>
  );
};

module.exports = { Picker };
