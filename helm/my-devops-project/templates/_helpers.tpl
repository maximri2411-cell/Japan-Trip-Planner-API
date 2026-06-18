{{- define "my-devops-project.fullname" -}}
# Defines a reusable function that generates a full resource name
# Combines Helm release name + chart name for uniqueness across cluster
{{- .Release.Name }}-{{ .Chart.Name }}
{{- end -}}

{{- define "my-devops-project.labels" -}}
# Defines a reusable block of Kubernetes labels (metadata)
# These labels are used for identification, selection, and grouping of resources

app.kubernetes.io/name: {{ .Chart.Name }}          # Name of the chart (application name)
app.kubernetes.io/instance: {{ .Release.Name }}    # Name of this Helm release (deployment instance)
{{- end -}}