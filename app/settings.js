import { Alert, View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, Card, Dialog, Portal } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema } from '../utils/validation';
import { useSettingsStore } from '../stores/settingsStore';
import { useEffect, useState } from 'react';
import { backupService } from '../services/backupService';
import { useInvoiceStore } from '../stores/invoiceStore';
import { useCustomerStore } from '../stores/customerStore';
import { SafeAreaScrollView } from '../components/SafeAreaContent';

export default function Settings() {
  const { settings, fetchSettings, updateSettings, loading } = useSettingsStore();
  const theme = useTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState(null);

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
    backupService.getLastBackup().then(setLastBackup).catch(error => {
      Alert.alert('Could not read backup information', error.message);
    });
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [reset, settings]);

  const onSubmit = async (data) => {
    await updateSettings(data);
    setVisible(true);
  };

  const createBackup = async () => {
    setBackupBusy(true);
    try {
      setLastBackup(await backupService.create());
      Alert.alert('Backup ready', 'Your business data backup was created and shared.');
    } catch (error) {
      Alert.alert('Could not create backup', error.message);
    } finally {
      setBackupBusy(false);
    }
  };

  const chooseBackup = async () => {
    setBackupBusy(true);
    try {
      const selection = await backupService.selectAndValidate();
      if (selection) setRestoreCandidate(selection);
    } catch (error) {
      Alert.alert('Backup not accepted', error.message);
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackup = () => Alert.alert(
    'Replace current app data?',
    'Restoring this backup will replace the current app data. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore Backup', style: 'destructive', onPress: async () => {
        setBackupBusy(true);
        try {
          await backupService.restore(restoreCandidate.payload);
          setRestoreCandidate(null);
          await Promise.all([
            fetchSettings(),
            useInvoiceStore.getState().fetchInvoices(),
            useCustomerStore.getState().fetchCustomers(),
          ]);
          setLastBackup(await backupService.getLastBackup());
          Alert.alert('Restore complete', 'Your backup data has been restored.');
          router.replace('/');
        } catch (error) {
          Alert.alert('Could not restore backup', error.message);
        } finally {
          setBackupBusy(false);
        }
      } },
    ]
  );

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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

        <Card style={styles.backupCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>Data Backup</Text>
            <Text variant="bodyMedium">Last Backup: {lastBackup ? new Date(lastBackup).toLocaleString() : 'Not created'}</Text>
            <Button mode="contained" icon="backup-restore" onPress={createBackup} loading={backupBusy} disabled={backupBusy} style={styles.backupButton}>
              Create Backup
            </Button>
            <Button mode="outlined" icon="restore" onPress={chooseBackup} loading={backupBusy} disabled={backupBusy}>
              Restore Backup
            </Button>
          </Card.Content>
        </Card>
        <View style={{ height: 40 }} />
      </SafeAreaScrollView>

      <Portal>
        <Dialog visible={!!restoreCandidate} onDismiss={() => setRestoreCandidate(null)}>
          <Dialog.Title>Restore Backup</Dialog.Title>
          <Dialog.Content>
            <Text>Backup Created: {restoreCandidate?.preview.createdAt ? new Date(restoreCandidate.preview.createdAt).toLocaleString() : 'Unknown'}</Text>
            <Text>Customers: {restoreCandidate?.preview.customers}</Text>
            <Text>Invoices: {restoreCandidate?.preview.invoices}</Text>
            <Text>Raw Entries: {restoreCandidate?.preview.rawEntries}</Text>
            <Text>Statements: {restoreCandidate?.preview.statements}</Text>
            <Text style={styles.restoreWarning}>Restoring this backup will replace the current app data.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRestoreCandidate(null)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={restoreBackup} disabled={backupBusy}>Restore</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  backupCard: {
    marginTop: 28,
    marginBottom: 16,
  },
  backupButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  restoreWarning: {
    marginTop: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ba1a1a',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  }
});
