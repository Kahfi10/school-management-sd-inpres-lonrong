# Mobile & Desktop Security Hardening Reference

Essential security guidelines for production client applications.

---

## 1. Biometric Authentication Pattern (React Native / Expo)

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

export async function promptBiometricAuth(promptMessage: string = 'Autentikasi untuk membuka sesi'): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Gunakan Kata Sandi',
    cancelLabel: 'Batal',
    disableDeviceFallback: false,
  });

  return result.success;
}
```

---

## 2. Tauri IPC Security Pattern

In Tauri v1/v2, prevent arbitrary command execution by scoping commands and using strict payload structs:

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn get_student_records(grade: String) -> Result<Vec<Student>, String> {
    // Validate input strictly before DB query
    if grade.is_empty() {
        return Err("Grade filter cannot be empty".into());
    }
    // Query database securely
    fetch_students_by_grade(&grade)
}
```
