import CustomerForm from '../../components/CustomerForm';
import { useCustomerStore } from '../../stores/customerStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { customerRepository } from '../../repositories/customerRepository';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

export default function EditCustomer() {
  const { updateCustomer, loading } = useCustomerStore();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    customerRepository.getById(id).then(setCustomer);
  }, [id]);

  const onSubmit = async (data) => {
    await updateCustomer(id, data);
    router.back();
  };

  if (!customer) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <CustomerForm initialValues={customer} onSubmit={onSubmit} loading={loading} title="Edit Customer" />;
}
