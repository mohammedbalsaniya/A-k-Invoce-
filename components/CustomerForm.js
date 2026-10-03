import { StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema } from '../utils/validation';
import { SafeAreaScrollView } from './SafeAreaContent';

export default function CustomerForm({ initialValues, onSubmit, loading, title }) {
  const theme = useTheme();
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: initialValues || {
      name: '',
      address: '',
      gstNumber: '',
      phone: ''
    }
  });

  return (
    <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>{title}</Text>
      
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Customer Name *"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={!!errors.name}
            style={styles.input}
            mode="outlined"
          />
        )}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
          />
        )}
      />

      <Controller
        control={control}
        name="gstNumber"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="GST Number"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={!!errors.gstNumber}
            style={styles.input}
            mode="outlined"
            autoCapitalize="characters"
          />
        )}
      />
      {errors.gstNumber && <Text style={styles.errorText}>{errors.gstNumber.message}</Text>}

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Phone Number"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={!!errors.phone}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
        )}
      />
      {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

      <Button 
        mode="contained" 
        onPress={handleSubmit(onSubmit)} 
        loading={loading}
        style={styles.button}
      >
        {initialValues ? 'Update Customer' : 'Save Customer'}
      </Button>
    </SafeAreaScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    paddingVertical: 4,
  },
  errorText: {
    color: '#ba1a1a',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  }
});
