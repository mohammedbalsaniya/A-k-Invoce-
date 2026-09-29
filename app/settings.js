import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema } from '../utils/validation';
import { useSettingsStore } from '../stores/settingsStore';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { settings, fetchSettings, updateSettings, loading } = useSettingsStore();
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      gstNumber: '',
      mobileNumber: '',
      address: '',
      bankName: '',
      accountNo: '',
      branchName: '',
      ifscCode: ''
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings]);

  const onSubmit = async (data) => {
    await updateSettings(data);
    setVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Organization Details</Text>
        
        <Controller
          control={control}
          name="companyName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Company Name *"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={!!errors.companyName}
              style={styles.input}
              mode="outlined"
            />
          )}
        />
        {errors.companyName && <Text style={styles.errorText}>{errors.companyName.message}</Text>}

        <Controller
          control={control}
          name="gstNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="GST Number"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
            />
          )}
        />

        <Controller
          control={control}
          name="mobileNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Mobile Number"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
            />
          )}
        />

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

        <Text variant="titleLarge" style={[styles.sectionTitle, { marginTop: 24 }]}>Bank Details</Text>

        <Controller
          control={control}
          name="bankName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Bank Name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
            />
          )}
        />

        <Controller
          control={control}
          name="accountNo"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Account Number"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
            />
          )}
        />

        <Controller
          control={control}
          name="branchName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Branch Name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
            />
          )}
        />

        <Controller
          control={control}
          name="ifscCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="IFSC Code"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={styles.input}
              mode="outlined"
            />
          )}
        />

        <Button 
          mode="contained" 
          onPress={handleSubmit(onSubmit)} 
          loading={loading}
          style={styles.button}
        >
          Save Settings
        </Button>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        Settings saved successfully!
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
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
