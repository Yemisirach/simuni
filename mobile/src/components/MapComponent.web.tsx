import React from 'react';
import { View, Text } from 'react-native';

export const MapView = (props: any) => (
  <View style={[props.style, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
    <Text>Interactive Map is currently only available on the Mobile App.</Text>
    {/* props.children hidden on web */}
  </View>
);
export const Marker = () => null;
export const Polyline = () => null;
export default MapView;
